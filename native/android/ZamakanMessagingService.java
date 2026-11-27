package org.zamakan.earth;
import android.Manifest;
import android.app.*;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class ZamakanMessagingService extends FirebaseMessagingService {
    @Override public void onMessageReceived(RemoteMessage message){
        if(!getSharedPreferences("zamakan_push",Context.MODE_PRIVATE).getBoolean("opted_in",false))return;
        if(!"research-test".equals(message.getData().get("type")))return;
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("research_updates","ZAMAKAN research updates",NotificationManager.IMPORTANCE_DEFAULT));
        NotificationCompat.Builder b=new NotificationCompat.Builder(this,"research_updates").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("ZAMAKAN").setContentText("Research notification test · اختبار إشعار تجريبي").setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT);
        manager.notify(2100,b.build());
        getSharedPreferences("zamakan_push",Context.MODE_PRIVATE).edit().putLong("last_received",System.currentTimeMillis()).apply();
    }
}
