import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwohhjrfmxiicjlgjyis.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3b2hoanJmbG14aWNqbGdqeWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDkxMDgsImV4cCI6MjA5MTY4NTEwOH0.i3JRlzYCrc3zDE9Ump7btuP3ePN-RBd33GLS2xhP57k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);