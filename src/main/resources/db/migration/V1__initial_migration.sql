create table urls
(
    id        bigint auto_increment
        primary key,
    long_url  text not null,
    short_url text not null
);


create table statistics
(
    id             bigint auto_increment
        primary key,
    accessed_times bigint default 0 null,
    url_id         bigint           not null,
    constraint statistics_urls_id_fk
        foreign key (url_id) references urls (id)
            on delete cascade
);