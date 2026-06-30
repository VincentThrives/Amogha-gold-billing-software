package com.vincent.amogha.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Renders errors as {"error": "..."} to match the frontend's expectations. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static ResponseEntity<Map<String, String>> body(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(Map.of("error", msg));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> handleApi(ApiException ex) {
        return body(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldError() != null
                ? ex.getBindingResult().getFieldError().getDefaultMessage()
                : "Invalid request.";
        return body(HttpStatus.BAD_REQUEST, msg);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return body(HttpStatus.FORBIDDEN, "Admin only");
    }

    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoAuth(AuthenticationCredentialsNotFoundException ex) {
        return body(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleOther(Exception ex) {
        return body(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage() == null ? "Server error" : ex.getMessage());
    }
}
