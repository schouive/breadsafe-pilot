-- Migration 1: Ajouter les nouveaux rôles à l'enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bureau_methodes';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';