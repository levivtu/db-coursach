with revenue as (
  select get_total_sales_revenue($1, $2) as total_revenue
),
buyers_stats as (
  select 
    b.id as buyer_id,
    u.name as buyer_name,
    coalesce(sum(o.total_price), 0) as total_spent
  from orders o
  join buyers b on o.buyer_id = b.id
  join users u on b.user_id = u.id
  where o.created_at between $1 and $2
  group by b.id, u.name
  order by total_spent desc
  limit 10
)
select 
  revenue.total_revenue,
  buyers_stats.buyer_id,
  buyers_stats.buyer_name,
  buyers_stats.total_spent
from revenue
left join buyers_stats on true
order by buyers_stats.total_spent desc nulls last;

