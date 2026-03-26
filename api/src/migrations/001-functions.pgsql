
-- functions for triggers start --

create or replace function calculate_cart_total()
returns trigger
language plpgsql
as $$
declare
    target_cart_id integer;
begin
    if tg_op = 'delete' then
        target_cart_id := old.cart_id;
    else
        target_cart_id := new.cart_id;
    end if;

    update carts
    set total_price = (
        select coalesce(sum(cc.amount * b.price), 0)
        from carts_contents cc
        join books b on cc.book_id = b.id
        where cc.cart_id = target_cart_id
    )
    where id = target_cart_id;

    if tg_op = 'delete' then
        return old;
    else
        return new;
    end if;
end;
$$;

create or replace function create_cart_for_buyer()
returns trigger
language plpgsql
as $$
declare
    new_cart_id integer;
begin
    insert into carts (buyer_id, total_price)
    values (new.id, 0)
    returning id into new_cart_id;

    return new;
end;
$$;

create or replace function calculate_returned_price()
returns trigger
language plpgsql
as $$
declare
    target_return_id integer;
    calculated_returned_price decimal(10,2);
begin
    if tg_op = 'delete' then
        target_return_id := old.return_id;
    else
        target_return_id := new.return_id;
    end if;

    select coalesce(sum(oc.price_per_book), 0)
    from returns_contents rc
    join orders_contents oc on rc.order_content_id = oc.id
    into calculated_returned_price
    where rc.return_id = target_return_id;

    update returns
    set returned_price = calculated_returned_price
    where id = target_return_id;

    if tg_op = 'delete' then
        return old;
    else
        return new;
    end if;
end;
$$;

-- functions for triggers end --

-- functions for queries start --

create or replace function get_total_sales_revenue(start_date date, end_date date)
returns decimal(10,2)
language plpgsql
as $$
declare
    total_revenue decimal(10,2);
begin
    select coalesce(sum(oc.amount * oc.price_per_book), 0)
    from orders o
    join orders_contents oc on o.id = oc.order_id
    where o.created_at >= start_date::timestamp
      and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
    into total_revenue;

    return total_revenue;
end;
$$;


create or replace function get_top_selling_books(start_date date, end_date date, limit_count integer default 10)
returns table(
    book_id integer,
    title text,
    total_sold integer,
    total_revenue decimal(10,2)
) 
language plpgsql
as $$
begin
    return query
    select 
        b.id as book_id,
        b.title::text as title,
        sum(oc.amount)::integer as total_sold,
        sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue
    from books b
    join orders_contents oc on b.id = oc.book_id
    join orders o on oc.order_id = o.id
    where o.created_at >= start_date::timestamp
      and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
    group by b.id, b.title
    order by total_sold desc
    limit limit_count;
end;
$$;

create or replace function get_average_order_value(start_date date, end_date date)
returns decimal(10,2)
language plpgsql
as $$
declare
    avg_value decimal(10,2);
begin
    select coalesce(avg(order_totals.total), 0)
    from (
        select o.id, sum(oc.amount * oc.price_per_book) as total
        from orders o
        join orders_contents oc on o.id = oc.order_id
        where o.created_at >= start_date::timestamp
          and o.created_at <= (end_date::timestamp + interval '23 hours 59 minutes 59 seconds')
        group by o.id
    ) as order_totals
    into avg_value;

    return avg_value;
end;
$$;

-- functions for queries end --
