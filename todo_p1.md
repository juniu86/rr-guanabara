# Melhorias P1 - RR-Guanabara

## 🟡 MELHORIA #1: Feedback Visual Durante Upload (1h)
- [x] Adicionar estado `uploadProgress` no NewMaintenance.tsx
- [x] Atualizar `handleSubmit` para rastrear progresso de upload
- [x] Adicionar UI de progresso com barra antes do botão submit
- [x] Importar componente Progress
- [x] Desabilitar botão durante upload
- [ ] Testar com múltiplas fotos

## 🟡 MELHORIA #2: Tratamento de Falha Parcial (30min)
- [x] Usar `Promise.allSettled` ao invés de `Promise.all`
- [x] Verificar falhas após uploads
- [x] Bloquear submissão se houver falhas
- [x] Mostrar toast informativo com quantidade de falhas
- [x] Não remover rascunho se houver falhas
- [ ] Testar com falha simulada

## 🟡 MELHORIA #3: Limite de Tamanho de Arquivo (15min)
- [x] Adicionar constante `MAX_FILE_SIZE = 5MB`
- [x] Adicionar helper `formatFileSize`
- [x] Atualizar `handlePhotoChange` para validar tamanho
- [x] Adicionar hint de tamanho máximo na UI
- [x] Mostrar toast para arquivos muito grandes
- [ ] Testar com arquivo > 5MB

## 🟡 MELHORIA #4: Validação de Tipo de Arquivo (15min)
- [x] Adicionar constantes `ALLOWED_FILE_TYPES` e `ALLOWED_FILE_EXTENSIONS`
- [x] Atualizar `handlePhotoChange` para validar tipo
- [x] Adicionar atributo `accept` no input de arquivo
- [x] Mostrar toast para tipos inválidos
- [ ] Testar com arquivo não-imagem (PDF, TXT, etc)

**Tempo total estimado**: 2 horas
