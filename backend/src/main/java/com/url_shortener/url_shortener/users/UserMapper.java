package com.url_shortener.url_shortener.users;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(UserRegister userRegister);

    @Mapping(target = "hasPassword", expression = "java(user.hasPassword())")
    @Mapping(target = "connectedOAuthProviders", source = "oauthAccounts", qualifiedByName = "mapOAuthProviders")
    UserDto toDto(User user);

    void update(UpdateUserRequest request, @MappingTarget User user);

    @Named("mapOAuthProviders")
    default List<String> mapOAuthProviders(List<UserOAuthAccount> oauthAccounts) {
        if (oauthAccounts == null || oauthAccounts.isEmpty()) {
            return Collections.emptyList();
        }
        return oauthAccounts.stream()
                .map(UserOAuthAccount::getProvider)
                .toList();
    }
}
