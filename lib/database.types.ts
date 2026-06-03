export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_id: string
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          adventure_id: string | null
          created_at: string
          description: string | null
          episode_id: string | null
          icon_url: string | null
          is_secret: boolean
          name: string
          points: number | null
          unlock_criteria: Json
        }
        Insert: {
          achievement_id?: string
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          adventure_id?: string | null
          created_at?: string
          description?: string | null
          episode_id?: string | null
          icon_url?: string | null
          is_secret?: boolean
          name: string
          points?: number | null
          unlock_criteria?: Json
        }
        Update: {
          achievement_id?: string
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          adventure_id?: string | null
          created_at?: string
          description?: string | null
          episode_id?: string | null
          icon_url?: string | null
          is_secret?: boolean
          name?: string
          points?: number | null
          unlock_criteria?: Json
        }
        Relationships: [
          {
            foreignKeyName: "achievements_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "achievements_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      adventures: {
        Row: {
          adventure_id: string
          adventure_type: Database["public"]["Enums"]["adventure_type"]
          cover_image_url: string | null
          created_at: string
          custom_data: Json
          description: string | null
          frontend_url: string | null
          is_active: boolean
          is_hub_visible: boolean
          name: string
          parent_adventure_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          adventure_id?: string
          adventure_type?: Database["public"]["Enums"]["adventure_type"]
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          frontend_url?: string | null
          is_active?: boolean
          is_hub_visible?: boolean
          name: string
          parent_adventure_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          adventure_id?: string
          adventure_type?: Database["public"]["Enums"]["adventure_type"]
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          frontend_url?: string | null
          is_active?: boolean
          is_hub_visible?: boolean
          name?: string
          parent_adventure_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventures_parent_adventure_id_fkey"
            columns: ["parent_adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
        ]
      }
      combination_recipe_inputs: {
        Row: {
          created_at: string
          input_id: string
          item_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          input_id?: string
          item_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          input_id?: string
          item_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combination_recipe_inputs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "combination_recipe_inputs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "combination_recipes"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      combination_recipe_outputs: {
        Row: {
          created_at: string
          item_id: string
          output_id: string
          quantity: number
          recipe_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          output_id?: string
          quantity?: number
          recipe_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          output_id?: string
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combination_recipe_outputs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "combination_recipe_outputs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "combination_recipes"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      combination_recipes: {
        Row: {
          adventure_id: string | null
          created_at: string
          episode_id: string | null
          is_active: boolean
          name: string
          recipe_id: string
          result_message: string
          updated_at: string
        }
        Insert: {
          adventure_id?: string | null
          created_at?: string
          episode_id?: string | null
          is_active?: boolean
          name: string
          recipe_id?: string
          result_message?: string
          updated_at?: string
        }
        Update: {
          adventure_id?: string | null
          created_at?: string
          episode_id?: string | null
          is_active?: boolean
          name?: string
          recipe_id?: string
          result_message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combination_recipes_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "combination_recipes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      conditions: {
        Row: {
          condition_id: string
          created_at: string
          episode_id: string
          node_id: string
          payload: Json
          type: string
        }
        Insert: {
          condition_id?: string
          created_at?: string
          episode_id: string
          node_id: string
          payload: Json
          type: string
        }
        Update: {
          condition_id?: string
          created_at?: string
          episode_id?: string
          node_id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "conditions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["node_id"]
          },
        ]
      }
      content_nodes: {
        Row: {
          content_html: string
          created_at: string
          custom_data: Json
          episode_id: string
          name: string
          node_category: Database["public"]["Enums"]["node_category"]
          node_id: string
          updated_at: string
        }
        Insert: {
          content_html?: string
          created_at?: string
          custom_data?: Json
          episode_id: string
          name: string
          node_category?: Database["public"]["Enums"]["node_category"]
          node_id?: string
          updated_at?: string
        }
        Update: {
          content_html?: string
          created_at?: string
          custom_data?: Json
          episode_id?: string
          name?: string
          node_category?: Database["public"]["Enums"]["node_category"]
          node_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_nodes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      effects: {
        Row: {
          created_at: string
          effect_id: string
          episode_id: string
          node_id: string
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string
          effect_id?: string
          episode_id: string
          node_id: string
          payload: Json
          type: string
        }
        Update: {
          created_at?: string
          effect_id?: string
          episode_id?: string
          node_id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "effects_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "effects_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["node_id"]
          },
        ]
      }
      episode_announcements: {
        Row: {
          announcement_id: string
          content: string
          created_at: string
          episode_id: string
          sent_by_player_id: string | null
        }
        Insert: {
          announcement_id?: string
          content: string
          created_at?: string
          episode_id: string
          sent_by_player_id?: string | null
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string
          episode_id?: string
          sent_by_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episode_announcements_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "episode_announcements_sent_by_player_id_fkey"
            columns: ["sent_by_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
        ]
      }
      episodes: {
        Row: {
          adventure_id: string
          cover_image_url: string | null
          created_at: string
          custom_data: Json
          description: string | null
          end_datetime: string | null
          episode_id: string
          episode_number: number | null
          is_active: boolean
          is_published: boolean
          join_mode: string
          location_gps_lat: number | null
          location_gps_lng: number | null
          max_players: number | null
          name: string
          physical_location: string | null
          slug: string | null
          start_datetime: string | null
          updated_at: string
        }
        Insert: {
          adventure_id: string
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          end_datetime?: string | null
          episode_id?: string
          episode_number?: number | null
          is_active?: boolean
          is_published?: boolean
          join_mode?: string
          location_gps_lat?: number | null
          location_gps_lng?: number | null
          max_players?: number | null
          name: string
          physical_location?: string | null
          slug?: string | null
          start_datetime?: string | null
          updated_at?: string
        }
        Update: {
          adventure_id?: string
          cover_image_url?: string | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          end_datetime?: string | null
          episode_id?: string
          episode_number?: number | null
          is_active?: boolean
          is_published?: boolean
          join_mode?: string
          location_gps_lat?: number | null
          location_gps_lng?: number | null
          max_players?: number | null
          name?: string
          physical_location?: string | null
          slug?: string | null
          start_datetime?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
        ]
      }
      exchange_sessions: {
        Row: {
          created_at: string
          episode_id: string
          player_a_confirmed: boolean
          player_a_id: string
          player_a_item_id: string | null
          player_b_confirmed: boolean
          player_b_id: string
          player_b_item_id: string | null
          session_id: string
          status: Database["public"]["Enums"]["exchange_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          player_a_confirmed?: boolean
          player_a_id: string
          player_a_item_id?: string | null
          player_b_confirmed?: boolean
          player_b_id: string
          player_b_item_id?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["exchange_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          player_a_confirmed?: boolean
          player_a_id?: string
          player_a_item_id?: string | null
          player_b_confirmed?: boolean
          player_b_id?: string
          player_b_item_id?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["exchange_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_sessions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "exchange_sessions_player_a_id_fkey"
            columns: ["player_a_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "exchange_sessions_player_a_item_id_fkey"
            columns: ["player_a_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "exchange_sessions_player_b_id_fkey"
            columns: ["player_b_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "exchange_sessions_player_b_item_id_fkey"
            columns: ["player_b_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
        ]
      }
      item_effects: {
        Row: {
          created_at: string
          duration_minutes: number | null
          effect_type: string
          is_active: boolean
          item_effect_id: string
          item_id: string
          metadata: Json
          trigger_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          effect_type: string
          is_active?: boolean
          item_effect_id?: string
          item_id: string
          metadata?: Json
          trigger_on?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          effect_type?: string
          is_active?: boolean
          item_effect_id?: string
          item_id?: string
          metadata?: Json
          trigger_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_effects_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
        ]
      }
      items: {
        Row: {
          adventure_id: string | null
          base_value: number | null
          category: string | null
          claim_code: string | null
          claim_limit: number | null
          claim_limit_per_player: number | null
          created_at: string
          custom_data: Json
          description: string | null
          effect_data: Json
          episode_id: string | null
          icon_url: string | null
          image_url: string | null
          is_consumable: boolean
          is_stackable: boolean
          is_transferable: boolean
          item_id: string
          max_stack: number
          name: string
          rarity: Database["public"]["Enums"]["item_rarity"]
          tags: string[]
          uniqueness_scope: Database["public"]["Enums"]["item_uniqueness_scope"]
          weight: number | null
        }
        Insert: {
          adventure_id?: string | null
          base_value?: number | null
          category?: string | null
          claim_code?: string | null
          claim_limit?: number | null
          claim_limit_per_player?: number | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          effect_data?: Json
          episode_id?: string | null
          icon_url?: string | null
          image_url?: string | null
          is_consumable?: boolean
          is_stackable?: boolean
          is_transferable?: boolean
          item_id?: string
          max_stack?: number
          name: string
          rarity?: Database["public"]["Enums"]["item_rarity"]
          tags?: string[]
          uniqueness_scope?: Database["public"]["Enums"]["item_uniqueness_scope"]
          weight?: number | null
        }
        Update: {
          adventure_id?: string | null
          base_value?: number | null
          category?: string | null
          claim_code?: string | null
          claim_limit?: number | null
          claim_limit_per_player?: number | null
          created_at?: string
          custom_data?: Json
          description?: string | null
          effect_data?: Json
          episode_id?: string | null
          icon_url?: string | null
          image_url?: string | null
          is_consumable?: boolean
          is_stackable?: boolean
          is_transferable?: boolean
          item_id?: string
          max_stack?: number
          name?: string
          rarity?: Database["public"]["Enums"]["item_rarity"]
          tags?: string[]
          uniqueness_scope?: Database["public"]["Enums"]["item_uniqueness_scope"]
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "items_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      map_markers: {
        Row: {
          adventure_id: string
          content_html: string
          created_at: string
          custom_data: Json
          description: string
          episode_id: string | null
          geometry: Json | null
          icon: string
          interaction_data: Json
          interaction_type: Database["public"]["Enums"]["marker_interaction_type"]
          is_active: boolean
          lat: number
          lng: number
          marker_id: string
          marker_shape: string
          marker_type: Database["public"]["Enums"]["marker_type"]
          name: string
          on_enter_actions: Json
          proximity_radius_m: number | null
          radius_meters: number
          sort_order: number
          updated_at: string
          visibility_rules: Json
        }
        Insert: {
          adventure_id: string
          content_html?: string
          created_at?: string
          custom_data?: Json
          description?: string
          episode_id?: string | null
          geometry?: Json | null
          icon?: string
          interaction_data?: Json
          interaction_type?: Database["public"]["Enums"]["marker_interaction_type"]
          is_active?: boolean
          lat: number
          lng: number
          marker_id?: string
          marker_shape?: string
          marker_type?: Database["public"]["Enums"]["marker_type"]
          name: string
          on_enter_actions?: Json
          proximity_radius_m?: number | null
          radius_meters?: number
          sort_order?: number
          updated_at?: string
          visibility_rules?: Json
        }
        Update: {
          adventure_id?: string
          content_html?: string
          created_at?: string
          custom_data?: Json
          description?: string
          episode_id?: string | null
          geometry?: Json | null
          icon?: string
          interaction_data?: Json
          interaction_type?: Database["public"]["Enums"]["marker_interaction_type"]
          is_active?: boolean
          lat?: number
          lng?: number
          marker_id?: string
          marker_shape?: string
          marker_type?: Database["public"]["Enums"]["marker_type"]
          name?: string
          on_enter_actions?: Json
          proximity_radius_m?: number | null
          radius_meters?: number
          sort_order?: number
          updated_at?: string
          visibility_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "map_markers_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "map_markers_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      player: {
        Row: {
          adventure_id: string
          avatar_url: string | null
          created_at: string
          display_name: string
          experience_points: number
          level: number
          player_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adventure_id: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          experience_points?: number
          level?: number
          player_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adventure_id?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          experience_points?: number
          level?: number
          player_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "player_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          player_id: string
          progress: number | null
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          player_id: string
          progress?: number | null
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          player_id?: string
          progress?: number | null
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["achievement_id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_current_location: {
        Row: {
          accuracy: number | null
          created_at: string
          episode_id: string | null
          heading: number | null
          position: unknown
          speed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          episode_id?: string | null
          heading?: number | null
          position: unknown
          speed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          episode_id?: string | null
          heading?: number | null
          position?: unknown
          speed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_current_location_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_current_location_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      player_episode_inventory: {
        Row: {
          acquired_at: string
          custom_data: Json
          durability: number | null
          episode_id: string
          is_equipped: boolean
          item_id: string
          player_id: string
          quantity: number
        }
        Insert: {
          acquired_at?: string
          custom_data?: Json
          durability?: number | null
          episode_id: string
          is_equipped?: boolean
          item_id: string
          player_id: string
          quantity?: number
        }
        Update: {
          acquired_at?: string
          custom_data?: Json
          durability?: number | null
          episode_id?: string
          is_equipped?: boolean
          item_id?: string
          player_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_episode_inventory_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_episode_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "player_episode_inventory_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_episode_stats: {
        Row: {
          created_at: string
          custom_stats: Json
          episode_id: string
          player_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_stats?: Json
          episode_id: string
          player_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_stats?: Json
          episode_id?: string
          player_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_episode_stats_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_episode_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_episode_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          },
        ]
      }
      player_status_effects: {
        Row: {
          applied_at: string
          episode_id: string
          expires_at: string | null
          metadata: Json
          player_id: string
          status_effect_id: string
          status_type: string
        }
        Insert: {
          applied_at?: string
          episode_id: string
          expires_at?: string | null
          metadata?: Json
          player_id: string
          status_effect_id?: string
          status_type: string
        }
        Update: {
          applied_at?: string
          episode_id?: string
          expires_at?: string | null
          metadata?: Json
          player_id?: string
          status_effect_id?: string
          status_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_status_effects_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_status_effects_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
        ]
      }
      player_steps: {
        Row: {
          created_at: string
          episode_id: string
          player_id: string
          progress_item_id: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          player_id: string
          progress_item_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          player_id?: string
          progress_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_steps_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_steps_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_steps_progress_item_id_fkey"
            columns: ["progress_item_id"]
            isOneToOne: false
            referencedRelation: "progress_items"
            referencedColumns: ["progress_item_id"]
          },
        ]
      }
      player_target_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          custom_data: Json
          episode_id: string
          player_id: string
          target_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          custom_data?: Json
          episode_id: string
          player_id: string
          target_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          custom_data?: Json
          episode_id?: string
          player_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_target_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "player_target_progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_target_progress_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "targets"
            referencedColumns: ["target_id"]
          },
        ]
      }
      progress_items: {
        Row: {
          created_at: string
          description: string | null
          episode_id: string
          name: string
          node_id: string | null
          progress_item_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          episode_id: string
          name: string
          node_id?: string | null
          progress_item_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          episode_id?: string
          name?: string
          node_id?: string | null
          progress_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_items_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "progress_items_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["node_id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          episode_id: string
          node_id: string
          payload: Json
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          node_id: string
          payload: Json
          target_id?: string
          type: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          node_id?: string
          payload?: Json
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "targets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "targets_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "content_nodes"
            referencedColumns: ["node_id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          player_id: string
          team_id: string
        }
        Insert: {
          joined_at?: string
          player_id: string
          team_id: string
        }
        Update: {
          joined_at?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string
          episode_id: string
          message_id: string
          player_id: string
          team_id: string
        }
        Insert: {
          content: string
          created_at?: string
          episode_id: string
          message_id?: string
          player_id: string
          team_id: string
        }
        Update: {
          content?: string
          created_at?: string
          episode_id?: string
          message_id?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
          {
            foreignKeyName: "team_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["team_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by_player_id: string
          episode_id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          created_by_player_id: string
          episode_id: string
          name: string
          team_id?: string
        }
        Update: {
          created_at?: string
          created_by_player_id?: string
          episode_id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_player_id_fkey"
            columns: ["created_by_player_id"]
            isOneToOne: false
            referencedRelation: "player"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "teams_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["episode_id"]
          },
        ]
      }
      user_adventure_pins: {
        Row: {
          adventure_id: string
          pinned_at: string
          sort_order: number
          user_id: string
        }
        Insert: {
          adventure_id: string
          pinned_at?: string
          sort_order?: number
          user_id: string
        }
        Update: {
          adventure_id?: string
          pinned_at?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_adventure_pins_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["adventure_id"]
          },
          {
            foreignKeyName: "user_adventure_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          custom_data: Json
          notification_email: boolean
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_data?: Json
          notification_email?: boolean
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_data?: Json
          notification_email?: boolean
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          is_admin: boolean
          is_event_organizer: boolean
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          is_admin?: boolean
          is_event_organizer?: boolean
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          is_admin?: boolean
          is_event_organizer?: boolean
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      combine_items: {
        Args: { p_episode_id: string; p_recipe_id: string }
        Returns: Json
      }
      create_team: {
        Args: { p_episode_id: string; p_name: string }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      execute_exchange: {
        Args: { p_session_id: string }
        Returns: {
          status: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_episode_player_locations: {
        Args: { p_episode_id: string }
        Returns: {
          display_name: string
          lat: number
          lng: number
          team_id: string
          user_id: string
        }[]
      }
      get_my_team_ids: { Args: never; Returns: string[] }
      get_player_locations: {
        Args: { p_player_ids: string[] }
        Returns: {
          lat: number
          lng: number
          user_id: string
        }[]
      }
      get_teammate_player_ids: { Args: never; Returns: string[] }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: { p_adventure_id?: string }; Returns: boolean }
      join_team: {
        Args: { p_episode_id: string; p_team_id: string }
        Returns: string
      }
      leave_team: { Args: { p_episode_id: string }; Returns: undefined }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      resolve_player_for_episode: {
        Args: { p_episode_id: string }
        Returns: string
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      achievement_type:
        | "story"
        | "exploration"
        | "social"
        | "collection"
        | "secret"
      adventure_type: "live_event" | "persistent" | "hybrid"
      exchange_status: "pending" | "completed" | "cancelled" | "expired"
      item_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      item_uniqueness_scope:
        | "none"
        | "per_player"
        | "per_episode"
        | "per_adventure"
        | "global"
      marker_interaction_type:
        | "none"
        | "claim_item"
        | "narrative"
        | "npc_dialog"
        | "zone_effect"
        | "team_unlock"
      marker_type:
        | "location"
        | "clue"
        | "npc"
        | "entrance"
        | "secret"
        | "danger"
        | "meeting_point"
      node_category:
        | "main_story"
        | "side_quest"
        | "exploration"
        | "social"
        | "combat"
        | "puzzle"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_type: [
        "story",
        "exploration",
        "social",
        "collection",
        "secret",
      ],
      adventure_type: ["live_event", "persistent", "hybrid"],
      exchange_status: ["pending", "completed", "cancelled", "expired"],
      item_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      item_uniqueness_scope: [
        "none",
        "per_player",
        "per_episode",
        "per_adventure",
        "global",
      ],
      marker_interaction_type: [
        "none",
        "claim_item",
        "narrative",
        "npc_dialog",
        "zone_effect",
        "team_unlock",
      ],
      marker_type: [
        "location",
        "clue",
        "npc",
        "entrance",
        "secret",
        "danger",
        "meeting_point",
      ],
      node_category: [
        "main_story",
        "side_quest",
        "exploration",
        "social",
        "combat",
        "puzzle",
      ],
    },
  },
} as const
