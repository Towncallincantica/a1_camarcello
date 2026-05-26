import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import CombinationsClient from './CombinationsClient'

export default async function CombinationsPage() {
  const supabase = await createClient()

  const { data: rawRecipes, error: recipesError } = await supabase
    .from('combination_recipes')
    .select(`
      recipe_id, name, result_message, is_active, episode_id, created_at,
      combination_recipe_inputs (
        input_id, item_id,
        items ( item_id, name, icon_url, rarity )
      ),
      combination_recipe_outputs (
        output_id, item_id, quantity,
        items ( item_id, name, icon_url, rarity )
      )
    `)
    .eq('adventure_id', ADVENTURE_ID)
    .order('name', { ascending: true })

  if (recipesError) {
    return (
      <div style={{ color: 'rgba(255,100,100,0.8)', padding: '1rem' }}>
        Errore: {recipesError.message}
      </div>
    )
  }

  // Supabase restituisce i joined rows come array — normalizziamo a oggetto singolo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipes = (rawRecipes ?? []).map((r: any) => ({
    ...r,
    combination_recipe_inputs: r.combination_recipe_inputs.map((inp: any) => ({
      ...inp,
      items: Array.isArray(inp.items) ? (inp.items[0] ?? null) : inp.items,
    })),
    combination_recipe_outputs: r.combination_recipe_outputs.map((out: any) => ({
      ...out,
      items: Array.isArray(out.items) ? (out.items[0] ?? null) : out.items,
    })),
  }))

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('item_id, name, icon_url, rarity, category')
    .eq('adventure_id', ADVENTURE_ID)
    .order('name', { ascending: true })

  if (itemsError) {
    return (
      <div style={{ color: 'rgba(255,100,100,0.8)', padding: '1rem' }}>
        Errore items: {itemsError.message}
      </div>
    )
  }

  return <CombinationsClient initialRecipes={recipes} allItems={items ?? []} />
}