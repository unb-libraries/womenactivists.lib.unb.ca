export async function useContentPage(key, query) {
  const { data } = await useAsyncData(key, query)

  if (!data.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return data
}
