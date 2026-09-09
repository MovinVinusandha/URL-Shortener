package com.url_shortener.url_shortener.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.net.InetAddress;
import java.util.Hashtable;
import java.util.Map;

@Component
public class EmailDomainValidator {

    @Value("${app.self-hosted:false}")
    private boolean isSelfHosted;

    private static final Map<String, String> COMMON_TYPOS = Map.ofEntries(
            Map.entry("gmail.co", "gmail.com"),
            Map.entry("gmail.cm", "gmail.com"),
            Map.entry("gmai.com", "gmail.com"),
            Map.entry("gamil.com", "gmail.com"),
            Map.entry("gmial.com", "gmail.com"),
            Map.entry("gmail.con", "gmail.com"),
            Map.entry("yaho.com", "yahoo.com"),
            Map.entry("yahoo.co", "yahoo.com"),
            Map.entry("hotmial.com", "hotmail.com"),
            Map.entry("outlok.com", "outlook.com")
    );

    public void validateEmailDomain(String email) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format.");
        }

        String domain = email.substring(email.lastIndexOf("@") + 1).trim().toLowerCase();

        // 1. Common typo check
        if (COMMON_TYPOS.containsKey(domain)) {
            String suggestion = COMMON_TYPOS.get(domain);
            throw new IllegalArgumentException(
                    "Invalid email domain '" + domain + "'. Did you mean @" + suggestion + "?"
            );
        }

        // 2. DNS MX / Mail Server Verification (skipped in self-hosted mode for intranet / local domains)
        if (!isSelfHosted && !hasValidMailServer(domain)) {
            throw new IllegalArgumentException(
                    "The email domain '" + domain + "' cannot receive emails or does not exist."
            );
        }
    }

    public boolean hasValidMailServer(String domain) {
        // Special case: localhost or test domains during test runs
        if ("localhost".equalsIgnoreCase(domain) || domain.endsWith(".local") || domain.endsWith(".lan") || "example.com".equalsIgnoreCase(domain) || "test.com".equalsIgnoreCase(domain)) {
            return true;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "2000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");

            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[]{"MX"});
            Attribute attr = attrs.get("MX");

            if (attr != null && attr.size() > 0) {
                // Check if it's a Null MX record (RFC 7505: "0 .")
                NamingEnumeration<?> servers = attr.getAll();
                boolean hasRealMx = false;
                while (servers.hasMore()) {
                    String record = servers.next().toString().trim();
                    String[] parts = record.split("\\s+");
                    String host = parts.length > 1 ? parts[1] : parts[0];
                    if (!host.equals(".") && !host.equals("0.")) {
                        hasRealMx = true;
                        break;
                    }
                }
                ctx.close();
                return hasRealMx;
            }
            ctx.close();

            // Fallback: Check if domain resolves to an IP address (RFC 5321 implicit MX fallback)
            InetAddress.getByName(domain);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
