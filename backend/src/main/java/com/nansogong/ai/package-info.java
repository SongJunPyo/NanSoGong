/**
 * Spring AI (ChatClient 설정, @Tool 도구 클래스). 프롬프트는 resources/prompts/*.st 파일로 둔다. AI 결과를 쓰는 API · 저장 · 검증은 각 도메인의 service 가 맡는다.
 * <p>
 * 클래스 이름 앞에 도메인 이름을 붙인다 (예: AgentTools, MenuRecipeAiClient). 도메인 · 담당 · 요구사항은 docs/notice/2026-11-23-개발-시작-안내.md 7-2장과 README "담당" 을 따른다.
 */
package com.nansogong.ai;
