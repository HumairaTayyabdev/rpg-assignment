import { gql } from '@apollo/client/core'

export const ALL_BLOG_POSTS_QUERY = gql`
  query AllBlogPosts {
    allBlogPosts {
      id
      title
      content
      authorId
      authorName
      createdAt
    }
  }
`

export const BLOG_PUBLISHED_SUBSCRIPTION = gql`
  subscription BlogPublished {
    blogPublished {
      post {
        id
        title
        content
        authorId
        authorName
        createdAt
      }
      authorName
    }
  }
`

export const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotifications {
    myNotifications {
      id
      read
      createdAt
      post {
        id
        title
        content
        authorId
        authorName
        createdAt
      }
    }
  }
`

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`

export const DELETE_POST_MUTATION = gql`
  mutation DeletePost($id: String!) {
    deletePost(id: $id)
  }
`

export const CREATE_POST_MUTATION = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      title
      content
      authorId
      authorName
      createdAt
    }
  }
`

export const UPDATE_POST_MUTATION = gql`
  mutation UpdatePost($id: String!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      id
      title
      content
      authorId
      authorName
      createdAt
    }
  }
`
