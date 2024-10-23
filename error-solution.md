
node 버전 문제.
```
error 내용
TypeDoc exiting with unexpected error:
TypeError: (0 , fs_1.cpSync) is not a function

대처 방안 
node version 확인 
node -v 

node 버전을 업데이트 
```


npm ERR! code ELIFECYCLE
```

대처 방법 
npm cache clean --force
rmdir /s node_modules
del package-lock.json

npm audit fix --force
npm upgrade --force
npm install
```


