import { z } from 'zod';

const emptyString = z.literal('');

export const officeBranchSchema = z.object({
  parent_office_id: z.string().uuid('parent_office_id_is_required'),
  branch_name: z
    .string()
    .trim()
    .min(2, 'branch_name_min_length')
    .max(100, 'branch_name_max_length'),
  email: z
    .union([emptyString, z.string().trim().toLowerCase().email('email_invalid')])
    .optional(),
  phone_number: z
    .union([emptyString, z.string().trim()])
    .optional(),
  country: z
    .string()
    .min(1, 'country_required'),
  city: z
    .string()
    .min(1, 'city_required_from_list'),
  bio: z
    .union([emptyString, z.string().trim().max(1000, 'bio_max_length')])
    .optional(),
  image: z.string().optional().nullable(),
  cover: z.string().optional().nullable(),
  is_active: z.boolean().default(false),
  login_email: z.string().optional(),
  use_contact_as_login: z.boolean().optional(),
});

export type OfficeBranchSchemaType = z.infer<typeof officeBranchSchema>;
