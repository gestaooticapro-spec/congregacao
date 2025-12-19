export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PerfilAcesso =
  | 'ADMIN'
  | 'SECRETARIO'
  | 'SUPERINTENDENTE_SERVICO'
  | 'RESP_QUINTA'
  | 'RESP_SABADO'
  | 'RQA'
  | 'IRMAO'

export type TipoReuniao = 'QUINTA' | 'SABADO'

export interface Database {
  public: {
    Tables: {
      escalas_campo: {
        Row: {
          id: string
          data: string
          dirigente_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          data: string
          dirigente_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          data?: string
          dirigente_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_campo_dirigente_id_fkey"
            columns: ["dirigente_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          }
        ]
      }
      grupos_servico: {
        Row: {
          id: string
          nome: string
          superintendente_id: string | null
          ajudante_id: string | null
        }
        Insert: {
          id?: string
          nome: string
          superintendente_id?: string | null
          ajudante_id?: string | null
        }
        Update: {
          id?: string
          nome?: string
          superintendente_id?: string | null
          ajudante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_servico_superintendente_id_fkey"
            columns: ["superintendente_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_servico_ajudante_id_fkey"
            columns: ["ajudante_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          }
        ]
      }
      membros: {
        Row: {
          id: string
          user_id: string | null
          nome_completo: string
          grupo_id: string | null
          is_anciao: boolean
          is_servo_ministerial: boolean
          is_publicador: boolean
          is_pioneiro: boolean
          is_batizado: boolean
          is_presidente: boolean
          is_leitor_biblia: boolean
          is_leitor_sentinela: boolean
          is_som: boolean
          is_microfone: boolean
          is_indicador: boolean
          is_balcao: boolean
          is_leitor_estudo_biblico: boolean
          is_parte_vida_ministerio: boolean
          is_ajudante: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nome_completo: string
          grupo_id?: string | null
          is_anciao?: boolean
          is_servo_ministerial?: boolean
          is_publicador?: boolean
          is_pioneiro?: boolean
          is_batizado?: boolean
          is_presidente?: boolean
          is_leitor_biblia?: boolean
          is_leitor_sentinela?: boolean
          is_som?: boolean
          is_microfone?: boolean
          is_indicador?: boolean
          is_balcao?: boolean
          is_leitor_estudo_biblico?: boolean
          is_parte_vida_ministerio?: boolean
          is_ajudante?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          nome_completo?: string
          grupo_id?: string | null
          is_anciao?: boolean
          is_servo_ministerial?: boolean
          is_publicador?: boolean
          is_pioneiro?: boolean
          is_batizado?: boolean
          is_presidente?: boolean
          is_leitor_biblia?: boolean
          is_leitor_sentinela?: boolean
          is_som?: boolean
          is_microfone?: boolean
          is_indicador?: boolean
          is_balcao?: boolean
          is_leitor_estudo_biblico?: boolean
          is_parte_vida_ministerio?: boolean
          is_ajudante?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_grupo_id_fkey"
            columns: ["grupo_id"]
            referencedRelation: "grupos_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      membro_perfis: {
        Row: {
          id: string
          membro_id: string
          perfil: PerfilAcesso
        }
        Insert: {
          id?: string
          membro_id: string
          perfil: PerfilAcesso
        }
        Update: {
          id?: string
          membro_id?: string
          perfil?: PerfilAcesso
        }
        Relationships: [
          {
            foreignKeyName: "membro_perfis_membro_id_fkey"
            columns: ["membro_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          }
        ]
      }
      programacao_semanal: {
        Row: {
          id: string
          data_reuniao: string
          semana_descricao: string
          temas_tesouros: string | null

          partes: Json | null
          presidente_id: string | null
          presidente_status: string | null
          oracao_inicial_id: string | null
          oracao_inicial_status: string | null
          oracao_final_id: string | null
          oracao_final_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          data_reuniao: string
          semana_descricao: string
          temas_tesouros?: string | null

          partes?: Json | null
          presidente_id?: string | null
          oracao_inicial_id?: string | null
          oracao_final_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          data_reuniao?: string
          semana_descricao?: string
          temas_tesouros?: string | null

          partes?: Json | null
          presidente_id?: string | null
          oracao_inicial_id?: string | null
          oracao_final_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      partes_reuniao: {
        Row: {
          id: string
          nome_parte: string
          tipo_reuniao: TipoReuniao
          requisitos: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          nome_parte: string
          tipo_reuniao: TipoReuniao
          requisitos?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          nome_parte?: string
          tipo_reuniao?: TipoReuniao
          requisitos?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      designacoes: {
        Row: {
          id: string
          programacao_id: string
          parte_id: string
          membro_id: string
          ajudante_id: string | null
          data: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          programacao_id: string
          parte_id: string
          membro_id: string
          ajudante_id?: string | null
          data: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          programacao_id?: string
          parte_id?: string
          membro_id?: string
          ajudante_id?: string | null
          data?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designacoes_programacao_id_fkey"
            columns: ["programacao_id"]
            referencedRelation: "programacao_semanal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designacoes_parte_id_fkey"
            columns: ["parte_id"]
            referencedRelation: "partes_reuniao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designacoes_membro_id_fkey"
            columns: ["membro_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designacoes_ajudante_id_fkey"
            columns: ["ajudante_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          }
        ]
      }
      historico_designacoes: {
        Row: {
          id: string
          membro_id: string
          programacao_id: string
          data_reuniao: string
          parte_descricao: string
          created_at: string
        }
        Insert: {
          id?: string
          membro_id: string
          programacao_id: string
          data_reuniao: string
          parte_descricao: string
          created_at?: string
        }
        Update: {
          id?: string
          membro_id?: string
          programacao_id?: string
          data_reuniao?: string
          parte_descricao?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_designacoes_membro_id_fkey"
            columns: ["membro_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_designacoes_programacao_id_fkey"
            columns: ["programacao_id"]
            referencedRelation: "programacao_semanal"
            referencedColumns: ["id"]
          }
        ]
      }
      designacoes_suporte: {
        Row: {
          id: string
          programacao_id: string | null
          membro_id: string | null
          funcao: 'SOM' | 'MICROFONE_1' | 'MICROFONE_2' | 'INDICADOR_ENTRADA' | 'INDICADOR_AUDITORIO' | 'VIDEO' | 'PRESIDENTE'
          data: string
          created_at: string
        }
        Insert: {
          id?: string
          programacao_id?: string | null
          membro_id?: string | null
          funcao: 'SOM' | 'MICROFONE_1' | 'MICROFONE_2' | 'INDICADOR_ENTRADA' | 'INDICADOR_AUDITORIO' | 'VIDEO' | 'PRESIDENTE'
          data: string
          created_at?: string
        }
        Update: {
          id?: string
          programacao_id?: string | null
          membro_id?: string | null
          funcao?: 'SOM' | 'MICROFONE_1' | 'MICROFONE_2' | 'INDICADOR_ENTRADA' | 'INDICADOR_AUDITORIO' | 'VIDEO' | 'PRESIDENTE'
          data?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "designacoes_suporte_programacao_id_fkey"
            columns: ["programacao_id"]
            referencedRelation: "programacao_semanal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designacoes_suporte_membro_id_fkey"
            columns: ["membro_id"]
            referencedRelation: "membros"
            referencedColumns: ["id"]
          }
        ]
      }
      escala_limpeza: {
        Row: {
          id: string
          data_inicio: string
          grupo_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          data_inicio: string
          grupo_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          data_inicio?: string
          grupo_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escala_limpeza_grupo_id_fkey"
            columns: ["grupo_id"]
            referencedRelation: "grupos_servico"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      perfil_acesso: PerfilAcesso
      tipo_reuniao: TipoReuniao
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
