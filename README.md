# dara.web.js

# 설치 방법
```
npm install


error 대처 방법
1.error : 
    npm WARN cleanup Failed to remove some directories [
    npm WARN cleanup   [
    npm WARN cleanup     'D:\\01.project\\02.sources\\dara-web-js\\node_modules\\jest-runner',
    npm WARN cleanup     [Error: EPERM: operation not permitted, rmdir 'D:\01.project\02.sources\dara-web-js\node_modules\jest-runner'] {

  해결방법 : 
    cmd 관리자 모드로 실행

2.error : 
    npm ERR! code SELF_SIGNED_CERT_IN_CHAIN
    npm ERR! errno SELF_SIGNED_CERT_IN_CHAIN
    npm ERR! request to https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz failed, reason: self-signed certificate in certificate chain

  해결방법 : 아래 코드 실행후 install 다시 실행
    npm config set strict-ssl false -g
```

# 빌드방법 
```
테스트 빌드
npm run build:dev

min 파일 빌드
npm run build:prod
```

# 테스트 방법 
```
npm run test "테스트 파일 경로"  
ex : npm run test "../test/StringUtils.test"
```

# tsdoc 생성 방법
```
npm run docs:gen
```

# eslint 사용방법
```
npx eslint "체크 파일"
ex : npx eslint ./src/index.ts
```