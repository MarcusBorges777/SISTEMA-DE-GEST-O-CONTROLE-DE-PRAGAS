package com.dedetizadora.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class InternalOnlyFilter extends OncePerRequestFilter {

    private static final String TOKEN_ENV = "JAVA_INTERNAL_TOKEN";
    private static final String TOKEN_HEADER = "X-Internal-Token";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (isLoopback(request.getRemoteAddr()) || hasValidInternalToken(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Acesso permitido apenas internamente");
    }

    private boolean hasValidInternalToken(HttpServletRequest request) {
        String expected = System.getenv(TOKEN_ENV);
        return expected != null
                && !expected.isBlank()
                && expected.equals(request.getHeader(TOKEN_HEADER));
    }

    private boolean isLoopback(String remoteAddr) {
        return "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr)
                || "localhost".equalsIgnoreCase(remoteAddr);
    }
}
