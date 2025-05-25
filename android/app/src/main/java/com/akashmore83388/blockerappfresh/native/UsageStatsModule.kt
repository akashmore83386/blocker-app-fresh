package com.akashmore83388.blockerappfresh.native

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.WritableNativeMap
import java.util.*

@ReactModule(name = UsageStatsModule.NAME)
class UsageStatsModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object { const val NAME = "UsageStatsModule" }
    override fun getName() = NAME

    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
        } else {
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun openUsageAccessSettings() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        reactContext.startActivity(intent)
    }
    
    @ReactMethod
    fun getAppUsageStats(startTime: Double, endTime: Double, promise: Promise) {
        try {
            val hasPermission = hasUsageStatsPermissionInternal()
            if (!hasPermission) {
                promise.reject("ERR_USAGE_STATS_PERMISSION", "Missing usage stats permission")
                return
            }
            
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val pm = reactContext.packageManager
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime.toLong(), endTime.toLong())
            val result = WritableNativeArray()
            
            for (stat in stats) {
                try {
                    val appInfo = pm.getApplicationInfo(stat.packageName, 0)
                    val appName = pm.getApplicationLabel(appInfo).toString()
                    
                    val usageData = WritableNativeMap().apply {
                        putString("packageName", stat.packageName)
                        putString("appName", appName)
                        putDouble("totalTimeInForeground", (stat.totalTimeInForeground / 1000).toDouble()) // Convert to seconds
                        putDouble("firstTimeStamp", stat.firstTimeStamp.toDouble())
                        putDouble("lastTimeStamp", stat.lastTimeStamp.toDouble())
                        putDouble("lastTimeUsed", stat.lastTimeUsed.toDouble())
                    }
                    
                    result.pushMap(usageData)
                } catch (e: PackageManager.NameNotFoundException) {
                    // Skip packages that are no longer installed
                    continue
                }
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE_STATS", e)
        }
    }
    
    @ReactMethod
    fun getAppUsageEvents(startTime: Double, endTime: Double, promise: Promise) {
        try {
            val hasPermission = hasUsageStatsPermissionInternal()
            if (!hasPermission) {
                promise.reject("ERR_USAGE_STATS_PERMISSION", "Missing usage stats permission")
                return
            }
            
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val events = usm.queryEvents(startTime.toLong(), endTime.toLong())
            val sessions = mutableMapOf<String, MutableList<Pair<Long, Long>>>()
            val currentForeground = mutableMapOf<String, Long>()
            
            // Process the events to create sessions
            val event = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                
                if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                    currentForeground[event.packageName] = event.timeStamp
                } else if (event.eventType == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                    val startTime = currentForeground[event.packageName]
                    if (startTime != null) {
                        val sessionsList = sessions.getOrPut(event.packageName) { mutableListOf() }
                        sessionsList.add(Pair(startTime, event.timeStamp))
                        currentForeground.remove(event.packageName)
                    }
                }
            }
            
            // Handle apps that are still in foreground
            val now = System.currentTimeMillis()
            currentForeground.forEach { (pkg, start) ->
                val sessionsList = sessions.getOrPut(pkg) { mutableListOf() }
                sessionsList.add(Pair(start, now))
            }
            
            // Convert to React Native format
            val result = WritableNativeArray()
            sessions.forEach { (pkg, sessionsList) ->
                sessionsList.forEach { (start, end) ->
                    val duration = (end - start) / 1000 // Convert to seconds
                    val sessionData = WritableNativeMap().apply {
                        putString("packageName", pkg)
                        putDouble("startTime", start.toDouble())
                        putDouble("endTime", end.toDouble())
                        putDouble("duration", duration.toDouble())
                        putBoolean("isOngoing", end == now)
                    }
                    result.pushMap(sessionData)
                }
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE_EVENTS", e)
        }
    }

    @ReactMethod
    fun getTodayUsageTime(packageNames: ReadableArray, promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, cal.timeInMillis, System.currentTimeMillis())
            val map = WritableNativeMap()
            for (i in 0 until packageNames.size()) {
                packageNames.getString(i)?.let { map.putInt(it, 0) }
            }
            stats.forEach { u ->
                val pkg = u.packageName
                if (pkg != null && map.hasKey(pkg)) {
                    map.putInt(pkg, (u.totalTimeInForeground / 60000).toInt())
                }
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_USAGE_STATS", e)
        }
    }
    
    // Helper method to check permissions internally
    private fun hasUsageStatsPermissionInternal(): Boolean {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
        } else {
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), reactContext.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
