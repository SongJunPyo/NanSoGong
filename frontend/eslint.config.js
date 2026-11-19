import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']), // 검사에서 제외할 경로 (빌드 결과물)
  {
    files: ['**/*.{js,jsx}'], // 테스트를 실행할 경로
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // shadcn/ui 가 생성한 컴포넌트 (npx shadcn@latest add ...)
    //   - buttonVariants 처럼 컴포넌트와 스타일 함수를 함께 export 한다 → Fast Refresh 경고 끄기
    //   - import * as React 를 그대로 두는 형식이다 → 쓰지 않는 React 는 허용
    //   생성된 파일을 손으로 고치지 않아도 lint 를 통과하게 하려는 설정
    files: ['src/components/ui/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },
])
