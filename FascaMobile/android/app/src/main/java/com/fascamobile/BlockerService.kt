package com.fascamobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class BlockerService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var isRunning = false
    private lateinit var usageStatsManager: UsageStatsManager
    
    private val checkInterval = 1000L // 1 second
    private var blocklist = setOf<String>()

    override fun onCreate() {
        super.onCreate()
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Read blocklist from SharedPreferences
        val prefs = getSharedPreferences("FascaPrefs", Context.MODE_PRIVATE)
        blocklist = prefs.getStringSet("BLOCKLIST", setOf()) ?: setOf()
        
        startForeground(1, buildNotification())
        
        if (!isRunning) {
            isRunning = true
            handler.post(checkForegroundAppRunnable)
        }
        
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        handler.removeCallbacks(checkForegroundAppRunnable)
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private val checkForegroundAppRunnable = object : Runnable {
        override fun run() {
            if (!isRunning) return
            
            val topPackage = getTopApp()
            if (topPackage != null && blocklist.contains(topPackage)) {
                // Block the app!
                val overlayIntent = Intent(this@BlockerService, OverlayActivity::class.java)
                overlayIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                startActivity(overlayIntent)
            }
            
            handler.postDelayed(this, checkInterval)
        }
    }

    private fun getTopApp(): String? {
        val time = System.currentTimeMillis()
        val usageEvents = usageStatsManager.queryEvents(time - 1000 * 60, time)
        var topPackage: String? = null
        val event = UsageEvents.Event()
        
        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                topPackage = event.packageName
            }
        }
        return topPackage
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "FascaBlockerChannel",
                "Fasca App Blocker",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "FascaBlockerChannel")
            .setContentTitle("Fasca is Active")
            .setContentText("Focus session is currently running. Distractions are blocked.")
            .setSmallIcon(R.mipmap.ic_launcher_round)
            .setOngoing(true)
            .build()
    }
}
