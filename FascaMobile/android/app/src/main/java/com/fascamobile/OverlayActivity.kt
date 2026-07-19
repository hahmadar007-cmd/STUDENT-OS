package com.fascamobile

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class OverlayActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#060611")) // Fasca Dark Background
            setPadding(60, 60, 60, 60)
        }

        val icon = TextView(this).apply {
            text = "🔒"
            textSize = 72f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }

        val title = TextView(this).apply {
            text = "App Blocked"
            setTextColor(Color.parseColor("#e2e8f0"))
            textSize = 28f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }

        val subtitle = TextView(this).apply {
            text = "Fasca is in Focus Mode.\nGet back to work."
            setTextColor(Color.parseColor("#94a3b8"))
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 80)
        }

        val button = Button(this).apply {
            text = "RETURN TO HOME"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#7c3aed"))
            setPadding(40, 30, 40, 30)
            setOnClickListener {
                // Go to home screen
                val homeIntent = Intent(Intent.ACTION_MAIN)
                homeIntent.addCategory(Intent.CATEGORY_HOME)
                homeIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(homeIntent)
                finish()
            }
        }

        layout.addView(icon)
        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(button)

        setContentView(layout)
    }

    override fun onBackPressed() {
        // Prevent back button
    }
}
