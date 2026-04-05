package com.url_shortener.url_shortener.urls;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Value;

@Mapper(componentModel = "spring")
public abstract class UrlMapper {

    @Mapping(target = "accessed_times", source = "statistic.accessedTimes")
    public abstract UrlDto toDto(Url url);

    public abstract UrlSend toSendDto(Url url);

    public abstract UrlUpdateDto toUpdateDto(Url url);

    public abstract Url toEntity(UrlRequest urlRequest);

    public abstract void updateUrl(UrlRequest urlRequest, @MappingTarget Url url);
}
