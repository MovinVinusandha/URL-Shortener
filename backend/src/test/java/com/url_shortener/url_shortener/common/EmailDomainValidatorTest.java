package com.url_shortener.url_shortener.common;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailDomainValidatorTest {

    private EmailDomainValidator validator;

    @BeforeEach
    void setUp() {
        validator = new EmailDomainValidator();
    }

    @Test
    void validateEmailDomain_ValidDomain_DoesNotThrow() {
        validator.validateEmailDomain("user@gmail.com");
        validator.validateEmailDomain("user@example.com");
        validator.validateEmailDomain("user@localhost");
    }

    @Test
    void validateEmailDomain_TypoGmailCo_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> validator.validateEmailDomain("movinvinusandha@gmail.co"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Did you mean @gmail.com?");
    }

    @Test
    void validateEmailDomain_TypoYaho_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> validator.validateEmailDomain("test@yaho.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Did you mean @yahoo.com?");
    }

    @Test
    void validateEmailDomain_NonExistentDomain_ThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> validator.validateEmailDomain("test@thisdomaindoesnotexist123456789.xyz"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot receive emails or does not exist");
    }
}
