import { GraphQLClient } from 'graphql-request'

export const client = new GraphQLClient('http://localhost:10011/graphql')

export const QUERY_ARTICLES = `
  query {
    posts(first: 20, where: { status: PUBLISH }) {
      nodes {
        id
        title
        excerpt
        date
        slug
        author { node { name } }
        featuredImage { node { sourceUrl altText } }
        tags { nodes { name } }
      }
    }
  }
`

export const QUERY_DOSSIERS = `
  query {
    dossiers(first: 20) {
      nodes {
        id
        title
        slug
        featuredImage { node { sourceUrl } }
        dossierMeta {
          titre
          description
          ajouterUnArticle
        }
      }
    }
  }
`

export const QUERY_PUBLICATIONS = `
  query {
    publications(first: 20) {
      nodes {
        id
        title
        slug
        featuredImage { node { sourceUrl } }
        publicationMeta {
          titre
          numero
          couverture
          description
          lienBoutique
        }
      }
    }
  }
`

export const QUERY_EQUIPE = `
  query {
    membresDeLQuipe(first: 50) {
      nodes {
        id
        title
        featuredImage { node { sourceUrl } }
        membreMeta {
          nom
          fonctionMembre
          bio
          photo
        }
      }
    }
  }
`