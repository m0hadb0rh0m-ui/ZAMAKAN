package org.zamakan.earth;
import android.Manifest;
import android.os.Build;
import android.content.Context;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name="ZamakanPush",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class ZamakanPushPlugin extends Plugin {
    private static final String TOPIC="zamakan_research_updates";
    private boolean optedIn(){return getContext().getSharedPreferences("zamakan_push",Context.MODE_PRIVATE).getBoolean("opted_in",false);}
    private void opt(boolean value){getContext().getSharedPreferences("zamakan_push",Context.MODE_PRIVATE).edit().putBoolean("opted_in",value).apply();}
    @PluginMethod public void status(PluginCall call){JSObject r=new JSObject();r.put("enabled",optedIn());r.put("lastReceived",getContext().getSharedPreferences("zamakan_push",Context.MODE_PRIVATE).getLong("last_received",0));call.resolve(r);}
    @PluginMethod public void enable(PluginCall call){
        if(Build.VERSION.SDK_INT>=33 && getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"permissionResult");return;}
        subscribe(call);
    }
    @PermissionCallback private void permissionResult(PluginCall call){if(getPermissionState("notifications")==PermissionState.GRANTED)subscribe(call);else call.reject("Notification permission denied");}
    private void subscribe(PluginCall call){
        FirebaseMessaging m=FirebaseMessaging.getInstance();m.setAutoInitEnabled(true);
        m.subscribeToTopic(TOPIC).addOnCompleteListener(task->{if(task.isSuccessful()){opt(true);call.resolve();}else{m.setAutoInitEnabled(false);call.reject("Subscription unavailable");}});
    }
    @PluginMethod public void disable(PluginCall call){
        opt(false);FirebaseMessaging m=FirebaseMessaging.getInstance();m.setAutoInitEnabled(false);
        m.unsubscribeFromTopic(TOPIC).addOnCompleteListener(task->m.deleteToken().addOnCompleteListener(deleted->{if(deleted.isSuccessful())call.resolve();else call.reject("Token deletion pending; local notifications disabled");}));
    }
}
