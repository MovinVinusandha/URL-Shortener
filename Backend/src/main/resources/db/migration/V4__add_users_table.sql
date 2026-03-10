alter table urls
    add user_id bigint null;

create table users
(
    id         bigint auto_increment
        primary key,
    name       varchar(255) not null,
    email      varchar(255) not null,
    password   varchar(255) not null,
    role       varchar(20)  not null,
    created_at datetime     not null
);

alter table urls
    add constraint urls_users_id_fk
        foreign key (user_id) references users (id);
