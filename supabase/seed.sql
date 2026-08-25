-- ============================================================
-- KisanSetu Seed Data (mandi_prices + logistics_providers)
-- Run AFTER schema.sql
-- Demo users/lots are created by supabase/seed-demo.ts
-- ============================================================

-- ─── MANDI PRICES (14 days × 5 crops × 5 mandis) ─────────
do $$
declare
  crops text[] := array['Wheat','Paddy','Cotton','Soybean','Tomato'];
  mandis text[] := array['Indore','Bhopal','Nagpur','Pune','Jaipur'];
  districts text[] := array['Indore','Bhopal','Nagpur','Pune','Jaipur'];
  base_prices numeric[] := array[2200, 2000, 6000, 4500, 1500];
  d date;
  i int;
  j int;
  price numeric;
begin
  for j in 1..14 loop
    d := current_date - (14 - j);
    for i in 1..5 loop
      for k in 1..5 loop
        price := base_prices[i] + (random() * 400 - 200)
                 + (j * base_prices[i] * 0.002 * (case when i in (1,4) then 1 else -1 end));
        insert into mandi_prices (crop, mandi, district, price_per_quintal, recorded_on)
        values (crops[i], mandis[k], districts[k], round(price::numeric, 0), d);
      end loop;
    end loop;
  end loop;
end $$;

-- ─── LOGISTICS PROVIDERS ──────────────────────────────────
insert into logistics_providers (name, type, district, contact_phone, capacity_tons, rate_per_km, address) values
-- Indore
('Sharma Transport Co.', 'transporter', 'Indore', '+91-9876543210', null, 12.5, 'Dewas Naka, Indore, MP'),
('Malwa Cold Chain', 'cold_storage', 'Indore', '+91-9765432109', 2000, null, 'Lasudia, Indore, MP'),
('Central Warehousing Corp - Indore', 'warehouse', 'Indore', '+91-7314001234', 5000, null, 'Pithampur, Indore, MP'),
-- Bhopal
('MP Agri Logistics', 'transporter', 'Bhopal', '+91-9654321098', null, 11.0, 'Mandideep, Bhopal, MP'),
('Bhopal FrostStore', 'cold_storage', 'Bhopal', '+91-9543210987', 1500, null, 'Bairagarh, Bhopal, MP'),
-- Nagpur
('Vidarbha Carriers', 'transporter', 'Nagpur', '+91-9432109876', null, 13.0, 'Butibori, Nagpur, MH'),
('Orange City Cold Storage', 'cold_storage', 'Nagpur', '+91-9321098765', 3000, null, 'Kamptee, Nagpur, MH'),
('APMC Warehouse Nagpur', 'warehouse', 'Nagpur', '+91-7122001234', 8000, null, 'Agro Market, Nagpur, MH'),
-- Pune
('Pune Agro Transport', 'transporter', 'Pune', '+91-9210987654', null, 14.5, 'Ranjangaon, Pune, MH'),
('Sahyadri Cold Chain', 'cold_storage', 'Pune', '+91-9109876543', 2500, null, 'Chakan, Pune, MH'),
-- Jaipur
('Rajasthan Roadways Agri', 'transporter', 'Jaipur', '+91-9098765432', null, 10.5, 'Sitapura, Jaipur, RJ'),
('Pink City Cold Store', 'cold_storage', 'Jaipur', '+91-8987654321', 1800, null, 'Muhana Mandi, Jaipur, RJ'),
('RSWC Warehouse Jaipur', 'warehouse', 'Jaipur', '+91-1412001234', 6000, null, 'Amanishah Naka, Jaipur, RJ');
