select 
  b.id as book_id,
  b.title::text as title,
  sum(oc.amount)::integer as total_sold,
  sum(oc.amount * oc.price_per_book)::decimal(10,2) as total_revenue
from books b
join orders_contents oc on b.id = oc.book_id
join orders o on oc.order_id = o.id
where o.created_at >= $1::date::timestamp
  and o.created_at <= ($2::date::timestamp + interval '23 hours 59 minutes 59 seconds')
group by b.id, b.title
order by total_sold desc
limit $3;

