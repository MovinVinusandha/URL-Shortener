package com.url_shortener.url_shortener.admin.audit;

public class AdminAuditContextHolder {

    private static final ThreadLocal<AdminActorContext> CONTEXT = new ThreadLocal<>();

    public static void setContext(AdminActorContext context) {
        CONTEXT.set(context);
    }

    public static AdminActorContext getContext() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
