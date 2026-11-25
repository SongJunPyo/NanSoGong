package com.nansogong.service;

import com.nansogong.dto.MenuOptionRequest;
import com.nansogong.dto.MenuOptionResponse;
import com.nansogong.dto.MenuRequest;
import com.nansogong.dto.MenuResponse;
import com.nansogong.model.Menu;
import com.nansogong.model.MenuSaleStatus;
import com.nansogong.model.MenuSource;
import com.nansogong.model.MenuType;
import com.nansogong.model.PosMappingStatus;
import com.nansogong.model.PosMenuMapping;
import com.nansogong.repository.MenuRepository;
import com.nansogong.repository.PosMenuMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 메뉴 · 옵션. 모든 메서드는 맨 앞에서 checkOwner 로 내 매장인지 확인한다.
 * TODO: 공용 BusinessException 이 생기면 ResponseStatusException 을 업무 예외로 바꾼다.
 */
@Service
@RequiredArgsConstructor
public class MenuService {

    private final StoreService storeService;
    private final MenuRepository menuRepository;
    private final PosMenuMappingRepository posMenuMappingRepository;

    /** 메뉴 목록: 기본 메뉴 + 각 메뉴의 옵션 + POS 연결 여부 (쿼리 3번) */
    @Transactional(readOnly = true)
    public List<MenuResponse> getMenus(Long memberId, Long storeId) {
        storeService.checkOwner(memberId, storeId);

        List<Menu> menus = menuRepository.findByStoreIdAndMenuTypeOrderByIdAsc(storeId, MenuType.MENU);
        Map<Long, List<Menu>> optionsByParent = menuRepository.findByStoreIdAndMenuTypeOrderByIdAsc(storeId, MenuType.OPTION)
                .stream()
                .collect(Collectors.groupingBy(Menu::getParentMenuId));
        Set<Long> connected = connectedMenuIds(storeId);

        return menus.stream()
                .map(menu -> toResponse(menu, optionsByParent.getOrDefault(menu.getId(), List.of()), connected))
                .toList();
    }

    /** 메뉴 하나 */
    @Transactional(readOnly = true)
    public MenuResponse getMenu(Long memberId, Long storeId, Long menuId) {
        storeService.checkOwner(memberId, storeId);
        Menu menu = findMenu(storeId, menuId);
        return toResponse(menu, menuRepository.findByParentMenuIdOrderByIdAsc(menu.getId()), connectedMenuIds(storeId));
    }

    /** 메뉴 등록 (사장님이 직접 등록) */
    @Transactional
    public MenuResponse createMenu(Long memberId, Long storeId, MenuRequest request) {
        storeService.checkOwner(memberId, storeId);
        Menu menu = Menu.create(storeId, request.name(), request.category(), request.price(), MenuSource.MANUAL);
        if (request.spec() != null) {
            menu.update(request.name(), request.category(), request.price(), request.spec());
        }
        menuRepository.save(menu);
        return MenuResponse.from(menu, false, List.of());
    }

    /** 메뉴 수정 */
    @Transactional
    public MenuResponse updateMenu(Long memberId, Long storeId, Long menuId, MenuRequest request) {
        storeService.checkOwner(memberId, storeId);
        Menu menu = findMenu(storeId, menuId);
        menu.update(request.name(), request.category(), request.price(), request.spec());   // @Transactional 이 끝날 때 자동 저장
        return getMenuResponse(storeId, menu);
    }

    /** 판매 상태 변경 (삭제 대신 INACTIVE) */
    @Transactional
    public MenuResponse changeSaleStatus(Long memberId, Long storeId, Long menuId, MenuSaleStatus saleStatus) {
        storeService.checkOwner(memberId, storeId);
        Menu menu = findMenu(storeId, menuId);
        menu.changeSaleStatus(saleStatus);
        return getMenuResponse(storeId, menu);
    }

    /** 옵션 등록. 부모는 같은 매장의 기본 메뉴만 (옵션에 옵션을 붙일 수 없다) */
    @Transactional
    public MenuOptionResponse createOption(Long memberId, Long storeId, Long parentMenuId, MenuOptionRequest request) {
        storeService.checkOwner(memberId, storeId);
        Menu parent = findMenu(storeId, parentMenuId);
        if (parent.isOption()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "옵션에는 옵션을 붙일 수 없습니다");
        }
        Menu option = Menu.createOption(storeId, parent.getId(), request.name(), request.price(), MenuSource.MANUAL);
        menuRepository.save(option);
        return MenuOptionResponse.from(option, false);
    }

    // ---- 내부 도우미 ----

    /** 이 매장의 메뉴만 찾는다. 다른 매장 메뉴 번호면 404 */
    private Menu findMenu(Long storeId, Long menuId) {
        return menuRepository.findByIdAndStoreId(menuId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다"));
    }

    /** POS 메뉴와 연결된 앱 메뉴 번호들 */
    private Set<Long> connectedMenuIds(Long storeId) {
        return posMenuMappingRepository.findByStoreIdAndStatus(storeId, PosMappingStatus.MAPPED).stream()
                .map(PosMenuMapping::getMenuId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private MenuResponse getMenuResponse(Long storeId, Menu menu) {
        List<Menu> options = menu.isOption() ? List.of() : menuRepository.findByParentMenuIdOrderByIdAsc(menu.getId());
        return toResponse(menu, options, connectedMenuIds(storeId));
    }

    private MenuResponse toResponse(Menu menu, List<Menu> options, Set<Long> connected) {
        List<MenuOptionResponse> optionResponses = options.stream()
                .map(o -> MenuOptionResponse.from(o, connected.contains(o.getId())))
                .toList();
        return MenuResponse.from(menu, connected.contains(menu.getId()), optionResponses);
    }
}
