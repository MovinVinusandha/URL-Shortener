package com.url_shortener.url_shortener.mappers;

import com.url_shortener.url_shortener.dtos.UpdateUserRequest;
import com.url_shortener.url_shortener.dtos.UserDto;
import com.url_shortener.url_shortener.dtos.UserRegister;
import com.url_shortener.url_shortener.entities.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(UserRegister userRegister);
    UserDto toDto(User user);
    void update(UpdateUserRequest request, @MappingTarget User user);
}
