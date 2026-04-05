package com.url_shortener.url_shortener.urls;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Value;

@Mapper(componentModel = "spring")
public abstract class UrlMapper {

    @Value("${app.domain:http://localhost:8080}")
    protected String appDomain;

    protected String buildShortUrl(String hash) {
        return appDomain.endsWith("/") ? appDomain + hash : appDomain + "/" + hash;
    }

    @Mapping(target = "accessed_times", source = "statistic.accessedTimes")
    @Mapping(target = "shortUrl", expression = "java(buildShortUrl(url.getShortUrl()))")
    public abstract UrlDto toDto(Url url);

    @Mapping(target = "shortUrl", expression = "java(buildShortUrl(url.getShortUrl()))")
    public abstract UrlSend toSendDto(Url url);

    @Mapping(target = "shortUrl", expression = "java(buildShortUrl(url.getShortUrl()))")
    public abstract UrlUpdateDto toUpdateDto(Url url);

    public abstract Url toEntity(UrlRequest urlRequest);

    public abstract void updateUrl(UrlRequest urlRequest, @MappingTarget Url url);
}
