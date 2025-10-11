package com.url_shortener.url_shortener.users;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(UserRegister userRegister);
    UserDto toDto(User user);
    void update(UpdateUserRequest request, @MappingTarget User user);
}
