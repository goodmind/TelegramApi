# Начало работы

Для использования библиотеки необходимо зарегистрировать свое приложение на https://my.telegram.org/.

## Общие правила

На странице необходимо подключить jQuery.
telegramApi-full.js следует подключать в блоке &lt;body&gt;

Настройки можно задать через метод setConfig
```
telegramApi.setConfig({
  app: {
    id: 0, /* ID приложения */
    hash: 'qwertyasdfghzxcvbnqwertyasd' /* Хеш приложения */
  },
  server: {
    test: [
      {
        id: 2, /* DC */
        host: '0.0.0.0', /* Адрес тестового сервера */
        port: 123 /* Порт тестового сервера */
      }
    ],
    production: [
      {
        id: 2, /* DC */
        host: '0.0.0.0', /* Адрес продакшн сервера */
        port: 123 /* Порт продакшн сервера */
      }
    ]
  }
});
```

## Bower компонент

Библиотека доступа как bower компонент.
```
bower install telegram-api
```
Для работы необходимо скопировать папки js и nacl в выходную папку рядом с index.html

## Сборка из исходников

Для сборки в папке проекта выполнить
```
npm run-script build
```
После сборки в папке example появятся дополнительные файлы, такие как telegramApi-full.js (.min.js) и другие служебные файлы, которые должны располагаться относительно страницы, на которой происходит взаимодействие с telegramApi, так же, как и в примере.