-- Product reviews: star rating + comment, with denormalized aggregate on products.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  is_verified_purchase boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_reviews_product_id
  on public.product_reviews(product_id);

grant select on public.product_reviews to anon;
grant select, insert, update, delete on public.product_reviews to authenticated;
grant all on public.product_reviews to service_role;

alter table public.product_reviews enable row level security;

drop policy if exists "public read product reviews" on public.product_reviews;
create policy "public read product reviews"
on public.product_reviews
for select
to anon, authenticated
using (true);

drop policy if exists "staff manage product reviews" on public.product_reviews;
create policy "staff manage product reviews"
on public.product_reviews
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

-- Denormalized rating aggregate on products, kept in sync by trigger below.
alter table public.products
  add column if not exists rating_average numeric(2,1) not null default 0,
  add column if not exists rating_count integer not null default 0;

-- Seed fictional reviews for every existing product: natural star distribution
-- (skewed positive, like a well-regarded retail brand) and varied Indonesian
-- review copy that reads like real customer comments.
do $$
declare
  v_product record;
  v_num_reviews int;
  v_i int;
  v_rand double precision;
  v_rating int;
  v_comment text;
  v_name text;
  v_created timestamptz;
  a5 text[] := array[
    'Kualitas %s bagus banget, sesuai foto dan deskripsi. Pengiriman juga cepat!',
    'Sudah pakai %s beberapa kali, awet dan nyaman dipakai. Recommended banget!',
    'Barangnya original, packing rapi, %s sesuai ukuran. Puas belanja di Consina.',
    'Ini pembelian kedua saya di sini, %s memang gak pernah mengecewakan. Mantap!',
    'Worth it banget buat harganya, %s kuat dan bahannya tebal.',
    'Cepat sampai, %s sesuai gambar, kualitas oke banget. Terima kasih Consina!',
    '%s nyaman dipakai seharian, gak bikin capek sama sekali. Bakal beli lagi.',
    'Suka banget sama %s ini, jahitannya rapi dan detailnya niat.',
    'Anak saya suka banget sama %s, ukurannya pas dan bahannya adem.',
    'Dipakai naik gunung minggu lalu, %s tahan cuaca dan nyaman banget.',
    'Gak nyesel beli %s, kualitasnya di atas ekspektasi. Top!',
    'Pelayanan cepat, %s sampai dalam kondisi mulus. Recommended seller!',
    'Udah langganan beli produk Consina, %s ini salah satu favorit saya.',
    'Bahan %s premium, jahitan kuat, cocok buat dipakai jangka panjang.',
    'Puas banget, %s persis kayak di foto dan deskripsinya jujur.',
    'Baru pertama kali coba %s, langsung suka. Bahannya enak dipakai.',
    'Request custom packing dikabulin, %s sampai rapi. Mantap pelayanannya.',
    'Second time buying, %s tetap konsisten kualitasnya. Percaya sama Consina.'
  ];
  a4 text[] := array[
    '%s bagus, cuma pengirimannya agak lama. Overall tetap puas.',
    'Kualitas oke, warnanya sedikit beda dari foto tapi masih bagus.',
    '%s nyaman dipakai, cuma ukurannya agak kebesaran dari biasanya.',
    'Barang sesuai deskripsi, respon CS juga cepat. Lumayan puas.',
    'Bahan %s lumayan tebal, harga sepadan sama kualitasnya.',
    'Secara keseluruhan oke, cuma box-nya agak penyok pas sampai.',
    '%s bagus buat dipakai santai, cuma ada jahitan yang kurang rapi dikit.',
    'Puas sama kualitasnya, cuma proses pengiriman bisa lebih cepat lagi.',
    '%s sesuai gambar, cuma warnanya agak lebih gelap sedikit dari foto.',
    'Lumayan bagus buat harga segini, %s worth it meski gak sempurna.'
  ];
  a3 text[] := array[
    '%s standar aja, sesuai harga. Gak istimewa tapi gak jelek juga.',
    'Lumayan, tapi ekspektasi saya lebih tinggi dari ini.',
    'Barang oke tapi pengirimannya lumayan lama, hampir seminggu.',
    '%s biasa aja, kualitas sesuai sama harganya yang murah.',
    'Ukurannya agak meleset dari size chart, tapi masih bisa dipakai.',
    'Cukup oke untuk pemakaian ringan, %s gak terlalu istimewa.',
    'Bahan %s lebih tipis dari yang saya kira, tapi masih layak pakai.'
  ];
  a2 text[] := array[
    '%s kurang sesuai ekspektasi, bahannya agak tipis dari yang saya kira.',
    'Pengiriman lama dan barangnya sedikit berbeda dari foto.',
    'Kurang puas, ada jahitan yang lepas pas baru dipakai sekali.',
    '%s oke tapi ukurannya kekecilan, harus tukar size, agak ribet.',
    'Warnanya beda jauh dari foto, agak kecewa dengan %s ini.'
  ];
  a1 text[] := array[
    'Kecewa, %s yang datang tidak sesuai dengan deskripsi.',
    'Barangnya cepat rusak, baru sebulan pakai sudah bermasalah.',
    'Pengiriman sangat lama dan tidak ada update, kurang puas.',
    '%s tidak sesuai ukuran yang saya pesan, kualitasnya juga standar.',
    'Kualitas mengecewakan untuk harga segini, gak sesuai ekspektasi saya.'
  ];
  names text[] := array[
    'Budi Santoso','Siti Nurhaliza','Andi Wijaya','Dewi Lestari','Rizky Pratama',
    'Putri Ayu','Agus Setiawan','Rina Marlina','Doni Kurniawan','Fitri Handayani',
    'Eko Prasetyo','Yuni Astuti','Hendra Gunawan','Maya Sari','Fajar Nugroho',
    'Indah Permata','Bayu Aditya','Ratna Sari','Wahyu Hidayat','Lina Marlina',
    'Dedi Kurniadi','Nia Ramadhani','Arif Rahman','Sri Wahyuni','Taufik Hidayat',
    'Ika Wulandari','Rendi Saputra','Novi Anggraini','Yoga Pratama','Diah Ayu',
    'Irfan Maulana','Tika Rahmawati','Galih Prakoso','Anisa Fitri','Wisnu Bagaskoro',
    'Melati Putri','Rahmat Hidayat','Citra Kirana','Aditya Nugraha','Ayu Lestari'
  ];
begin
  for v_product in
    select p.id, p.name_id
    from public.products p
    where not exists (
      select 1
      from public.product_reviews pr
      where pr.product_id = p.id
    )
  loop
    v_num_reviews := 2 + floor(random() * 5)::int; -- 2..6 reviews per product
    for v_i in 1..v_num_reviews loop
      v_rand := random();
      if v_rand < 0.50 then
        v_rating := 5;
        v_comment := a5[1 + floor(random() * array_length(a5, 1))::int];
      elsif v_rand < 0.78 then
        v_rating := 4;
        v_comment := a4[1 + floor(random() * array_length(a4, 1))::int];
      elsif v_rand < 0.92 then
        v_rating := 3;
        v_comment := a3[1 + floor(random() * array_length(a3, 1))::int];
      elsif v_rand < 0.97 then
        v_rating := 2;
        v_comment := a2[1 + floor(random() * array_length(a2, 1))::int];
      else
        v_rating := 1;
        v_comment := a1[1 + floor(random() * array_length(a1, 1))::int];
      end if;

      v_comment := replace(v_comment, '%s', v_product.name_id);
      v_name := names[1 + floor(random() * array_length(names, 1))::int];
      v_created := now() - (random() * interval '270 days');

      insert into public.product_reviews (product_id, author_name, rating, comment, is_verified_purchase, created_at)
      values (v_product.id, v_name, v_rating, v_comment, (random() < 0.85), v_created);
    end loop;
  end loop;
end $$;

-- Populate aggregates from the seed data just inserted.
update public.products p
set rating_average = coalesce(s.avg_rating, 0),
    rating_count = coalesce(s.cnt, 0)
from (
  select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
  from public.product_reviews
  group by product_id
) s
where s.product_id = p.id;

-- Keep aggregates in sync for any future insert/update/delete on product_reviews.
create or replace function public.update_product_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_product_id uuid;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  update public.products p
  set rating_average = coalesce(s.avg_rating, 0),
      rating_count = coalesce(s.cnt, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as cnt
    from public.product_reviews
    where product_id = v_product_id
  ) s
  where p.id = v_product_id;
  return null;
end;
$func$;

drop trigger if exists trg_product_reviews_stats on public.product_reviews;
create trigger trg_product_reviews_stats
after insert or update or delete on public.product_reviews
for each row execute function public.update_product_rating_stats();
