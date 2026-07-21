-- Chilean regions/communes, seeded once from a static reference list
-- (source: https://gist.github.com/hugojerez/d2dc17fddf52202755e3d4a9cffdfa82),
-- persisted here instead of fetched at runtime so the property form
-- never depends on that gist staying online.

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null
);

create table public.communes (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete restrict,
  name text not null,
  unique (region_id, name)
);

create index communes_region_id_idx on public.communes (region_id);

grant select on public.regions to authenticated, anon, service_role;
grant select on public.communes to authenticated, anon, service_role;
alter table public.regions enable row level security;
alter table public.communes enable row level security;
create policy regions_select_all on public.regions for select to authenticated, anon using (true);
create policy communes_select_all on public.communes for select to authenticated, anon using (true);

insert into public.regions (name, sort_order) values ('Arica y Parinacota', 0);
insert into public.regions (name, sort_order) values ('Tarapacá', 1);
insert into public.regions (name, sort_order) values ('Antofagasta', 2);
insert into public.regions (name, sort_order) values ('Atacama', 3);
insert into public.regions (name, sort_order) values ('Coquimbo', 4);
insert into public.regions (name, sort_order) values ('Valparaíso', 5);
insert into public.regions (name, sort_order) values ('Región del Libertador Gral. Bernardo O’Higgins', 6);
insert into public.regions (name, sort_order) values ('Región del Maule', 7);
insert into public.regions (name, sort_order) values ('Región de Ñuble', 8);
insert into public.regions (name, sort_order) values ('Región del Biobío', 9);
insert into public.regions (name, sort_order) values ('Región de la Araucanía', 10);
insert into public.regions (name, sort_order) values ('Región de Los Ríos', 11);
insert into public.regions (name, sort_order) values ('Región de Los Lagos', 12);
insert into public.regions (name, sort_order) values ('Región Aisén del Gral. Carlos Ibáñez del Campo', 13);
insert into public.regions (name, sort_order) values ('Región de Magallanes y de la Antártica Chilena', 14);
insert into public.regions (name, sort_order) values ('Región Metropolitana de Santiago', 15);

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Arica y Parinacota'), 'Arica'),
  ((select id from public.regions where name = 'Arica y Parinacota'), 'Camarones'),
  ((select id from public.regions where name = 'Arica y Parinacota'), 'Putre'),
  ((select id from public.regions where name = 'Arica y Parinacota'), 'General Lagos');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Tarapacá'), 'Iquique'),
  ((select id from public.regions where name = 'Tarapacá'), 'Alto Hospicio'),
  ((select id from public.regions where name = 'Tarapacá'), 'Pozo Almonte'),
  ((select id from public.regions where name = 'Tarapacá'), 'Camiña'),
  ((select id from public.regions where name = 'Tarapacá'), 'Colchane'),
  ((select id from public.regions where name = 'Tarapacá'), 'Huara'),
  ((select id from public.regions where name = 'Tarapacá'), 'Pica');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Antofagasta'), 'Antofagasta'),
  ((select id from public.regions where name = 'Antofagasta'), 'Mejillones'),
  ((select id from public.regions where name = 'Antofagasta'), 'Sierra Gorda'),
  ((select id from public.regions where name = 'Antofagasta'), 'Taltal'),
  ((select id from public.regions where name = 'Antofagasta'), 'Calama'),
  ((select id from public.regions where name = 'Antofagasta'), 'Ollagüe'),
  ((select id from public.regions where name = 'Antofagasta'), 'San Pedro de Atacama'),
  ((select id from public.regions where name = 'Antofagasta'), 'Tocopilla'),
  ((select id from public.regions where name = 'Antofagasta'), 'María Elena');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Atacama'), 'Copiapó'),
  ((select id from public.regions where name = 'Atacama'), 'Caldera'),
  ((select id from public.regions where name = 'Atacama'), 'Tierra Amarilla'),
  ((select id from public.regions where name = 'Atacama'), 'Chañaral'),
  ((select id from public.regions where name = 'Atacama'), 'Diego de Almagro'),
  ((select id from public.regions where name = 'Atacama'), 'Vallenar'),
  ((select id from public.regions where name = 'Atacama'), 'Alto del Carmen'),
  ((select id from public.regions where name = 'Atacama'), 'Freirina'),
  ((select id from public.regions where name = 'Atacama'), 'Huasco');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Coquimbo'), 'La Serena'),
  ((select id from public.regions where name = 'Coquimbo'), 'Coquimbo'),
  ((select id from public.regions where name = 'Coquimbo'), 'Andacollo'),
  ((select id from public.regions where name = 'Coquimbo'), 'La Higuera'),
  ((select id from public.regions where name = 'Coquimbo'), 'Paiguano'),
  ((select id from public.regions where name = 'Coquimbo'), 'Vicuña'),
  ((select id from public.regions where name = 'Coquimbo'), 'Illapel'),
  ((select id from public.regions where name = 'Coquimbo'), 'Canela'),
  ((select id from public.regions where name = 'Coquimbo'), 'Los Vilos'),
  ((select id from public.regions where name = 'Coquimbo'), 'Salamanca'),
  ((select id from public.regions where name = 'Coquimbo'), 'Ovalle'),
  ((select id from public.regions where name = 'Coquimbo'), 'Combarbalá'),
  ((select id from public.regions where name = 'Coquimbo'), 'Monte Patria'),
  ((select id from public.regions where name = 'Coquimbo'), 'Punitaqui'),
  ((select id from public.regions where name = 'Coquimbo'), 'Río Hurtado');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Valparaíso'), 'Valparaíso'),
  ((select id from public.regions where name = 'Valparaíso'), 'Casablanca'),
  ((select id from public.regions where name = 'Valparaíso'), 'Concón'),
  ((select id from public.regions where name = 'Valparaíso'), 'Juan Fernández'),
  ((select id from public.regions where name = 'Valparaíso'), 'Puchuncaví'),
  ((select id from public.regions where name = 'Valparaíso'), 'Quintero'),
  ((select id from public.regions where name = 'Valparaíso'), 'Viña del Mar'),
  ((select id from public.regions where name = 'Valparaíso'), 'Isla de Pascua'),
  ((select id from public.regions where name = 'Valparaíso'), 'Los Andes'),
  ((select id from public.regions where name = 'Valparaíso'), 'Calle Larga'),
  ((select id from public.regions where name = 'Valparaíso'), 'Rinconada'),
  ((select id from public.regions where name = 'Valparaíso'), 'San Esteban'),
  ((select id from public.regions where name = 'Valparaíso'), 'La Ligua'),
  ((select id from public.regions where name = 'Valparaíso'), 'Cabildo'),
  ((select id from public.regions where name = 'Valparaíso'), 'Papudo'),
  ((select id from public.regions where name = 'Valparaíso'), 'Petorca'),
  ((select id from public.regions where name = 'Valparaíso'), 'Zapallar'),
  ((select id from public.regions where name = 'Valparaíso'), 'Quillota'),
  ((select id from public.regions where name = 'Valparaíso'), 'Calera'),
  ((select id from public.regions where name = 'Valparaíso'), 'Hijuelas'),
  ((select id from public.regions where name = 'Valparaíso'), 'La Cruz'),
  ((select id from public.regions where name = 'Valparaíso'), 'Nogales'),
  ((select id from public.regions where name = 'Valparaíso'), 'San Antonio'),
  ((select id from public.regions where name = 'Valparaíso'), 'Algarrobo'),
  ((select id from public.regions where name = 'Valparaíso'), 'Cartagena'),
  ((select id from public.regions where name = 'Valparaíso'), 'El Quisco'),
  ((select id from public.regions where name = 'Valparaíso'), 'El Tabo'),
  ((select id from public.regions where name = 'Valparaíso'), 'Santo Domingo'),
  ((select id from public.regions where name = 'Valparaíso'), 'San Felipe'),
  ((select id from public.regions where name = 'Valparaíso'), 'Catemu'),
  ((select id from public.regions where name = 'Valparaíso'), 'Llaillay'),
  ((select id from public.regions where name = 'Valparaíso'), 'Panquehue'),
  ((select id from public.regions where name = 'Valparaíso'), 'Putaendo'),
  ((select id from public.regions where name = 'Valparaíso'), 'Santa María'),
  ((select id from public.regions where name = 'Valparaíso'), 'Quilpué'),
  ((select id from public.regions where name = 'Valparaíso'), 'Limache'),
  ((select id from public.regions where name = 'Valparaíso'), 'Olmué'),
  ((select id from public.regions where name = 'Valparaíso'), 'Villa Alemana');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Rancagua'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Codegua'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Coinco'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Coltauco'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Doñihue'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Graneros'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Las Cabras'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Machalí'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Malloa'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Mostazal'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Olivar'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Peumo'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Pichidegua'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Quinta de Tilcoco'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Rengo'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Requínoa'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'San Vicente'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Pichilemu'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'La Estrella'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Litueche'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Marchihue'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Navidad'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Paredones'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'San Fernando'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Chépica'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Chimbarongo'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Lolol'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Nancagua'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Palmilla'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Peralillo'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Placilla'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Pumanque'),
  ((select id from public.regions where name = 'Región del Libertador Gral. Bernardo O’Higgins'), 'Santa Cruz');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región del Maule'), 'Talca'),
  ((select id from public.regions where name = 'Región del Maule'), 'Constitución'),
  ((select id from public.regions where name = 'Región del Maule'), 'Curepto'),
  ((select id from public.regions where name = 'Región del Maule'), 'Empedrado'),
  ((select id from public.regions where name = 'Región del Maule'), 'Maule'),
  ((select id from public.regions where name = 'Región del Maule'), 'Pelarco'),
  ((select id from public.regions where name = 'Región del Maule'), 'Pencahue'),
  ((select id from public.regions where name = 'Región del Maule'), 'Río Claro'),
  ((select id from public.regions where name = 'Región del Maule'), 'San Clemente'),
  ((select id from public.regions where name = 'Región del Maule'), 'San Rafael'),
  ((select id from public.regions where name = 'Región del Maule'), 'Cauquenes'),
  ((select id from public.regions where name = 'Región del Maule'), 'Chanco'),
  ((select id from public.regions where name = 'Región del Maule'), 'Pelluhue'),
  ((select id from public.regions where name = 'Región del Maule'), 'Curicó'),
  ((select id from public.regions where name = 'Región del Maule'), 'Hualañé'),
  ((select id from public.regions where name = 'Región del Maule'), 'Licantén'),
  ((select id from public.regions where name = 'Región del Maule'), 'Molina'),
  ((select id from public.regions where name = 'Región del Maule'), 'Rauco'),
  ((select id from public.regions where name = 'Región del Maule'), 'Romeral'),
  ((select id from public.regions where name = 'Región del Maule'), 'Sagrada Familia'),
  ((select id from public.regions where name = 'Región del Maule'), 'Teno'),
  ((select id from public.regions where name = 'Región del Maule'), 'Vichuquén'),
  ((select id from public.regions where name = 'Región del Maule'), 'Linares'),
  ((select id from public.regions where name = 'Región del Maule'), 'Colbún'),
  ((select id from public.regions where name = 'Región del Maule'), 'Longaví'),
  ((select id from public.regions where name = 'Región del Maule'), 'Parral'),
  ((select id from public.regions where name = 'Región del Maule'), 'Retiro'),
  ((select id from public.regions where name = 'Región del Maule'), 'San Javier'),
  ((select id from public.regions where name = 'Región del Maule'), 'Villa Alegre'),
  ((select id from public.regions where name = 'Región del Maule'), 'Yerbas Buenas');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región de Ñuble'), 'Cobquecura'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Coelemu'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Ninhue'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Portezuelo'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Quirihue'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Ránquil'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Treguaco'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Bulnes'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Chillán Viejo'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Chillán'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'El Carmen'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Pemuco'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Pinto'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Quillón'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'San Ignacio'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Yungay'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Coihueco'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'Ñiquén'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'San Carlos'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'San Fabián'),
  ((select id from public.regions where name = 'Región de Ñuble'), 'San Nicolás');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región del Biobío'), 'Concepción'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Coronel'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Chiguayante'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Florida'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Hualqui'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Lota'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Penco'),
  ((select id from public.regions where name = 'Región del Biobío'), 'San Pedro de la Paz'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Santa Juana'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Talcahuano'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Tomé'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Hualpén'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Lebu'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Arauco'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Cañete'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Contulmo'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Curanilahue'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Los Álamos'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Tirúa'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Los Ángeles'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Antuco'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Cabrero'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Laja'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Mulchén'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Nacimiento'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Negrete'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Quilaco'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Quilleco'),
  ((select id from public.regions where name = 'Región del Biobío'), 'San Rosendo'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Santa Bárbara'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Tucapel'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Yumbel'),
  ((select id from public.regions where name = 'Región del Biobío'), 'Alto Biobío');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Temuco'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Carahue'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Cunco'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Curarrehue'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Freire'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Galvarino'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Gorbea'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Lautaro'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Loncoche'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Melipeuco'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Nueva Imperial'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Padre las Casas'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Perquenco'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Pitrufquén'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Pucón'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Saavedra'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Teodoro Schmidt'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Toltén'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Vilcún'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Villarrica'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Cholchol'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Angol'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Collipulli'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Curacautín'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Ercilla'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Lonquimay'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Los Sauces'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Lumaco'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Purén'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Renaico'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Traiguén'),
  ((select id from public.regions where name = 'Región de la Araucanía'), 'Victoria');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Valdivia'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Corral'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Lanco'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Los Lagos'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Máfil'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Mariquina'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Paillaco'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Panguipulli'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'La Unión'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Futrono'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Lago Ranco'),
  ((select id from public.regions where name = 'Región de Los Ríos'), 'Río Bueno');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Puerto Montt'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Calbuco'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Cochamó'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Fresia'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Frutillar'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Los Muermos'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Llanquihue'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Maullín'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Puerto Varas'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Castro'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Ancud'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Chonchi'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Curaco de Vélez'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Dalcahue'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Puqueldón'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Queilén'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Quellón'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Quemchi'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Quinchao'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Osorno'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Puerto Octay'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Purranque'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Puyehue'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Río Negro'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'San Juan de la Costa'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'San Pablo'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Chaitén'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Futaleufú'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Hualaihué'),
  ((select id from public.regions where name = 'Región de Los Lagos'), 'Palena');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Coihaique'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Lago Verde'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Aisén'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Cisnes'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Guaitecas'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Cochrane'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'O’Higgins'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Tortel'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Chile Chico'),
  ((select id from public.regions where name = 'Región Aisén del Gral. Carlos Ibáñez del Campo'), 'Río Ibáñez');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Punta Arenas'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Laguna Blanca'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Río Verde'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'San Gregorio'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Cabo de Hornos (Ex Navarino)'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Antártica'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Porvenir'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Primavera'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Timaukel'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Natales'),
  ((select id from public.regions where name = 'Región de Magallanes y de la Antártica Chilena'), 'Torres del Paine');

insert into public.communes (region_id, name) values
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Cerrillos'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Cerro Navia'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Conchalí'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'El Bosque'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Estación Central'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Huechuraba'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Independencia'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'La Cisterna'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'La Florida'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'La Granja'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'La Pintana'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'La Reina'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Las Condes'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Lo Barnechea'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Lo Espejo'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Lo Prado'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Macul'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Maipú'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Ñuñoa'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Pedro Aguirre Cerda'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Peñalolén'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Providencia'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Pudahuel'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Quilicura'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Quinta Normal'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Recoleta'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Renca'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Santiago'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San Joaquín'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San Miguel'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San Ramón'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Vitacura'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Puente Alto'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Pirque'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San José de Maipo'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Colina'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Lampa'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Tiltil'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San Bernardo'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Buin'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Calera de Tango'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Paine'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Melipilla'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Alhué'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Curacaví'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'María Pinto'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'San Pedro'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Talagante'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'El Monte'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Isla de Maipo'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Padre Hurtado'),
  ((select id from public.regions where name = 'Región Metropolitana de Santiago'), 'Peñaflor');
