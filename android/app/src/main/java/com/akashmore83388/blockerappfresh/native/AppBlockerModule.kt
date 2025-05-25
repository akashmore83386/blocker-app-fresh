package com.akashmore83388.blockerappfresh.native

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AppBlockerModule.NAME)
class AppBlockerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object { const val NAME = "AppBlockerModule" }
    override fun getName() = NAME

    private fun serviceIntent() = Intent(reactContext, AppBlockerService::class.java)

    // In-memory storage for blocked package names. Persistence can be added later if desired
    private val blockedPackages: MutableSet<String> = mutableSetOf()
    private val handler = Handler(Looper.getMainLooper())
    private val prefs: SharedPreferences = reactContext.getSharedPreferences("app_blocker_prefs", Context.MODE_PRIVATE)

    init {
        loadFromPrefs()
    }

    private fun persist() {
        prefs.edit().putStringSet("blocked_packages", blockedPackages).apply()
    }

    private fun loadFromPrefs() {
        blockedPackages.clear()
        blockedPackages.addAll(prefs.getStringSet("blocked_packages", emptySet()) ?: emptySet())
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun startBlockerService(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent())
            } else {
                reactContext.startService(serviceIntent())
            }
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_BLOCKER", e) }
    }

    @ReactMethod
    fun stopBlockerService(promise: Promise) {
        try {
            reactContext.stopService(serviceIntent())
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_BLOCKER", e) }
    }

    @ReactMethod
    fun blockApps(packageNames: ReadableArray, promise: Promise) {
        for (i in 0 until packageNames.size()) {
            packageNames.getString(i)?.let { blockedPackages.add(it) }
        }
        persist()
        promise.resolve(true)
    }

    @ReactMethod
    fun unblockApp(packageName: String, promise: Promise) {
        blockedPackages.remove(packageName)
        persist()
        promise.resolve(true)
    }

    @ReactMethod
    fun unblockAppTemporarily(packageName: String, durationMinutes: Int, promise: Promise) {
        blockedPackages.remove(packageName)
        handler.postDelayed({ blockedPackages.add(packageName); persist() }, durationMinutes * 60 * 1000L)
        persist()
        promise.resolve(true)
    }

    @ReactMethod
    fun getBlockedApps(promise: Promise) {
        val array = Arguments.createArray().apply {
            blockedPackages.forEach { pushString(it) }
        }
        promise.resolve(array)
    }

    @ReactMethod
    fun isAppInForeground(packageName: String, promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningTasks = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.appTasks
                    .firstOrNull()?.taskInfo?.topActivity?.packageName
            } else {
                @Suppress("DEPRECATION")
                am.getRunningTasks(1).firstOrNull()?.topActivity?.packageName
            }
            promise.resolve(packageName == runningTasks)
        } catch (e: Exception) {
            promise.reject("ERR_FOREGROUND", e)
        }
    }
}