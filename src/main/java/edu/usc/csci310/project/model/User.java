package edu.usc.csci310.project.model;

import java.time.LocalDateTime;

public class User {
    private String username;
    private String password;
    private int failedLoginAttempts;
    private boolean accountLocked;
    private LocalDateTime lockTime;

    public User(String username, String password, int failedLoginAttempts, boolean accountLocked, LocalDateTime lockTime) {
        this.username = username;
        this.password = password;
        this.failedLoginAttempts = failedLoginAttempts;
        this.accountLocked = accountLocked;
        this.lockTime = lockTime;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public void setFailedLoginAttempts(int failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts;
    }

    public boolean isAccountLocked() {
        return accountLocked;
    }

    public void setAccountLocked(boolean accountLocked) {
        this.accountLocked = accountLocked;
    }

    public LocalDateTime getLockTime() {
        return lockTime;
    }

    public void setLockTime(LocalDateTime lockTime) {
        this.lockTime = lockTime;
    }
}
