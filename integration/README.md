# Verificação de integração PWA para F3

O arquivo `pwa-update.f3.test.tsx.fixture` é um teste Vitest/RTL pronto para a árvore composta F2a/F2b/F2c. Copie-o para `src/app/__tests__/pwa-update-integration.test.tsx` e execute `npm test -- src/app/__tests__/pwa-update-integration.test.tsx`. Os imports usam caminhos relativos a esse destino. A extensão `.fixture` mantém o teste fora do runner enquanto as telas F2a/F2b ainda não existem neste child.

O teste usa `App`, as quatro telas reais e `useServiceWorkerUpdate`, simula apenas o evento do navegador e espiona a recarga. Ele verifica atualização durante jogo, retorno à Home, dispensa e clique explícito após outra troca de controlador. F3 deve conectar a função estável `useUpdate={useServiceWorkerUpdate}` no `App` e integrar `usePwaInstall` à Home.
