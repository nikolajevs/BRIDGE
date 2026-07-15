package com.nikolajevs.bridge

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {

    // ─────────────────────────────────────────────────────────────────────
    //  АДРЕС СЕРВЕРА. Замени на свой (IP или домен с портом).
    //  Например: "http://203.0.113.10:10067"  или  "https://bridge.example.com"
    private val gameUrl = "https://dvinsk.lat"
    // ─────────────────────────────────────────────────────────────────────

    private val gameHost: String by lazy { Uri.parse(gameUrl).host.orEmpty().lowercase() }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true          // игра — это JS
            domStorageEnabled = true          // localStorage: токен сессии, аккаунт, имя, звук
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
        }
        webView.keepScreenOn = true           // не гасить экран во время партии

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                handleUrl(request.url)
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(gameUrl)
        }
    }

    /** Свой ли это адрес (домен игры, с www или без). */
    private fun isOwnHost(host: String?): Boolean {
        if (host.isNullOrEmpty() || gameHost.isEmpty()) return false
        val h = host.lowercase()
        return h == gameHost || h == "www.$gameHost" || "www.$h" == gameHost
    }

    /**
     * Страницы игры открываем внутри приложения, всё остальное отдаём системе:
     * ссылку на Telegram подхватит приложение Telegram, донат — браузер.
     * WebView умеет только http/https, поэтому схемы вроде tg: без этого дают
     * «ошибка при загрузке tg:resolve?domain=…».
     */
    private fun handleUrl(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase()
        val isWeb = scheme == "http" || scheme == "https"
        if (isWeb && isOwnHost(uri.host)) return false   // наша игра — грузим в WebView

        if (openExternally(uri)) return true

        // Telegram не установлен: открываем ту же ссылку как обычную веб-страницу
        if (scheme == "tg") {
            val domain = uri.getQueryParameter("domain")
            if (!domain.isNullOrEmpty() && openExternally(Uri.parse("https://t.me/$domain"))) return true
        }
        Toast.makeText(this, "Нет приложения для этой ссылки", Toast.LENGTH_SHORT).show()
        return true
    }

    /**
     * Отдаём ссылку системе. Намеренно без resolveActivity(): начиная с Android 11
     * он возвращает null из-за видимости пакетов, и рабочие ссылки молча терялись бы.
     */
    private fun openExternally(uri: Uri): Boolean = try {
        startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    } catch (e: ActivityNotFoundException) {
        false
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)           // не терять состояние при повороте
    }

    // «Назад» — назад по истории WebView, иначе штатный выход
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
