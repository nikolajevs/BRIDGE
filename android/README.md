# Бридж — Android-приложение

Тонкая обёртка вокруг веб-игры: полноэкранный `WebView`, который открывает
твой сервер как обычное приложение. Логика игры целиком остаётся на сервере,
поэтому **обновления игры не требуют пересборки APK** — они прилетают сами
через обычный деплой. Приложение без внешних зависимостей.

## 1. Указать адрес сервера

Открой `app/src/main/java/com/nikolajevs/bridge/MainActivity.kt` и замени
значение `gameUrl` на адрес своего сервера:

```kotlin
private val gameUrl = "http://203.0.113.10:10067"   // свой IP или домен с портом
```

Если позже поднимешь домен и HTTPS — просто впиши `https://...`.

## 2. Собрать APK

**Через Android Studio (проще всего):**
1. Android Studio → Open → выбрать папку `android/`.
2. Дождаться Gradle sync (студия сама докачает Gradle 8.9 и SDK при необходимости).
3. Меню **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
4. По готовности нажать **locate** — там `app/build/outputs/apk/debug/app-debug.apk`.
5. Скинуть файл на телефон и установить (нужно разрешить установку из этого источника).

**Через командную строку** (если установлен Android SDK и задан `ANDROID_HOME`):
```bash
cd android
# первый раз, если нет gradle-wrapper: gradle wrapper
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## 3. (Опционально) Подписанный release-APK

Для раздачи вне отладки собери release и подпиши своим ключом:
```bash
keytool -genkey -v -keystore bridge.keystore -alias bridge -keyalg RSA -keysize 2048 -validity 10000
./gradlew assembleRelease   # после настройки signingConfig в app/build.gradle
```
Для публикации в Google Play нужен аккаунт разработчика и, как правило, HTTPS-домен.

## Технические детали

- `minSdk 26` (Android 8.0+), `compileSdk/targetSdk 35`.
- `usesCleartextTraffic="true"` — чтобы работал `http://` и `ws://` к твоему серверу
  без HTTPS. Когда перейдёшь на HTTPS, это можно убрать.
- Включён `domStorageEnabled` — игра хранит в localStorage токен сессии, данные
  аккаунта, имя и настройку звука; без него не работали бы вход и переподключение.
- Поворот экрана не перезагружает страницу (сохранение состояния WebView).
- Кнопка «Назад» листает историю WebView, затем выходит.
