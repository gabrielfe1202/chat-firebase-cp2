const fs = require('fs');

/**
 * Configuração dinâmica do Expo: parte do app.json e só ajusta os arquivos nativos do Firebase.
 *
 * O google-services.json fica fora do Git (.gitignore), então o EAS Build não o recebe pelo repositório.
 * Lá ele chega como "file environment variable" (GOOGLE_SERVICES_JSON, cujo valor é o caminho do arquivo
 * enviado ao build). Na máquina local, usamos o arquivo da raiz, se existir.
 */
module.exports = ({ config }) => {
  const androidFile = process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);
  const iosFile = process.env.GOOGLE_SERVICE_INFO_PLIST ?? (fs.existsSync('./GoogleService-Info.plist') ? './GoogleService-Info.plist' : undefined);

  return {
    ...config,
    android: { ...config.android, googleServicesFile: androidFile },
    ios: { ...config.ios, googleServicesFile: iosFile },
  };
};
