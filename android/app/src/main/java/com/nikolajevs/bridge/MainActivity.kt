package com.nikolajevs.bridge

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    // ─────────────────────────────────────────────────────────────────────
    //  АДРЕС СЕРВЕРА. Замени на свой (IP или домен с портом).
    //  Например: "http://203.0.113.10:10067"  или  "https://bridge.example.com"
    private val gameUrl = "http://ЗАМЕНИ_НА_СВОЙ_АДРЕС:10067"
    // ─────────────────────────────────────────────────────────────────────

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
        // вся навигация остаётся внутри приложения
        webView.webViewClient = WebViewClient()

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(gameUrl)
        }
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
