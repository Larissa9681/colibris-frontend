import { useState, useEffect } from 'react'
import {
    client,
    QUERY_ARTICLES,
    QUERY_DOSSIERS,
    QUERY_PUBLICATIONS,
    QUERY_EQUIPE,
} from '../lib/api'

function useGQL(query, cle) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        client
            .request(query)
            .then((res) => {
                setData(res[cle]?.nodes ?? [])
                setLoading(false)
            })
            .catch((err) => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    return { data, loading, error }
}

export const useArticles = () => useGQL(QUERY_ARTICLES, 'posts')
export const useDossiers = () => useGQL(QUERY_DOSSIERS, 'dossiers')
export const usePublications = () => useGQL(QUERY_PUBLICATIONS, 'publications')
export const useEquipe = () => useGQL(QUERY_EQUIPE, 'membresDeLQuipe')

export function stripHtml(html) {
    return html ? html.replace(/<[^>]+>/g, '').trim() : ''
}

export function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export const FALLBACK = {
    article: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop',
    dossier: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&h=500&fit=crop',
    publication: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=560&fit=crop',
    portrait: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
}