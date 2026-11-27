"""모든 모델이 물려받는 공통 설정."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Python 코드 안에서는 snake_case(item_id), JSON 으로는 camelCase(itemId).

    Java record 와 JSON 모양을 맞추기 위한 것이다 (AGENTS.md 3-2).
    - alias_generator: item_id 칸의 JSON 이름을 itemId 로 자동으로 정한다
    - populate_by_name: 만들 때 item_id= 로도, itemId 로도 받을 수 있다
    - serialize_by_alias: 내보낼 때(model_dump) 항상 camelCase 로 내보낸다
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True)
