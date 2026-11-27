package org.zamakan.earth;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "PrimeBilling")
public class PrimeBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String PRODUCT = "zamakan_prime";
    private BillingClient client;
    private ProductDetails details;
    private final Map<String, ProductDetails.SubscriptionOfferDetails> offers = new HashMap<>();
    @Override public void load() {
        client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void connect(PluginCall call, Runnable task) {
        if (client.isReady()) { task.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) task.run();
                else call.reject("Google Play Billing unavailable");
            }
            public void onBillingServiceDisconnected() {}
        });
    }
    @PluginMethod public void products(PluginCall call) {
        connect(call, () -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.SUBS).build();
            client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(product)).build(), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Product unavailable"); return; }
                List<ProductDetails> list = response.getProductDetailsList();
                JSArray items = new JSArray(); offers.clear(); details=null;
                for (ProductDetails d : list) {
                    if (!PRODUCT.equals(d.getProductId()) || d.getSubscriptionOfferDetails()==null) continue;
                    details = d;
                    for (ProductDetails.SubscriptionOfferDetails offer : d.getSubscriptionOfferDetails()) {
                        // Only ordinary base plans, no unadvertised trial/offer.
                        if (offer.getOfferId()!=null) continue;
                        List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();
                        if (phases.size()!=1) continue;
                        ProductDetails.PricingPhase phase=phases.get(0);
                        String period=phase.getBillingPeriod();
                        if (!"P1M".equals(period)&&!"P1Y".equals(period)) continue;
                        if (phase.getRecurrenceMode()!=ProductDetails.RecurrenceMode.INFINITE_RECURRING) continue;
                        offers.put(offer.getBasePlanId(),offer);
                        JSObject item=new JSObject();item.put("id",offer.getBasePlanId());item.put("price",phase.getFormattedPrice());item.put("period",period);items.put(item);
                    }
                }
                JSObject out=new JSObject();out.put("offers",items);call.resolve(out);
            });
        });
    }
    @PluginMethod public void buy(PluginCall call) {
        String plan=call.getString("plan"),account=call.getString("accountId");
        if(account==null||!account.matches("[a-f0-9]{64}")||plan==null||!offers.containsKey(plan)||details==null){call.reject("Invalid subscription plan");return;}
        connect(call, () -> getActivity().runOnUiThread(() -> {
            BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).setOfferToken(offers.get(plan).getOfferToken()).build();
            BillingResult result=client.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).setObfuscatedAccountId(account).build());
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)call.resolve();else call.reject("Purchase could not start");
        }));
    }
    private JSArray purchaseList(List<Purchase> purchases) {
        JSArray list=new JSArray();
        if(purchases!=null)for(Purchase p:purchases){
            if(p.getProducts().contains(PRODUCT)&&p.getPurchaseState()==Purchase.PurchaseState.PURCHASED){
                JSObject item=new JSObject();item.put("token",p.getPurchaseToken());list.put(item);
            }
        }
        return list;
    }
    @PluginMethod public void restore(PluginCall call){
        connect(call,()->client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(result,purchases)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){call.reject("Restore unavailable");return;}
            JSObject out=new JSObject();out.put("purchases",purchaseList(purchases));call.resolve(out);
        }));
    }
    @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases){
        JSObject out=new JSObject();out.put("code",result.getResponseCode());out.put("purchases",purchaseList(purchases));notifyListeners("purchaseUpdated",out,true);
    }
    @Override protected void handleOnDestroy(){if(client!=null)client.endConnection();super.handleOnDestroy();}
}
