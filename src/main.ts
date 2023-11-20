import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { baseContent } from './utils'

const CONTEXT_LENGTH = 128000
const COMMENT_POSITION = 1

const RETURN_CODES = {
  SUCCESS: 0,
  FAILURE: 1
} as const

const handleError = (
  error: unknown,
  core: { setFailed: (msg: string) => void }
): number => {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error :c'

  core.setFailed(errorMessage)
  console.error(errorMessage)

  return RETURN_CODES.FAILURE
}

/**
 * The main function for the action.
 * @returns {Promise<number>} Resolves when the action is complete.
 */
export async function run(): Promise<number> {
  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Starting action...`)

    // Fetching github token and getting octokit client
    const githubToken = core.getInput('github-token')
    const gptApiKey = core.getInput('gpt-api-key')
    const octokit = github.getOctokit(githubToken)

    // Get the context
    const { owner, repo, number } = github.context.issue

    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number
    })

    const commitId = pr.head.sha

    // Get PR files modified
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: number
    })

    // List comments on the pull request
    const { data: comments } = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: number
    })

    // Find and delete the comment at the specific position
    for (const comment of comments) {
      if (comment.position === COMMENT_POSITION) {
        await octokit.rest.pulls.deleteReviewComment({
          owner,
          repo,
          comment_id: comment.id
        })
        console.log(`Deleted comment at position ${COMMENT_POSITION}`)
      }
    }

    for (const file of files) {
      const filePath = file.filename
      const patch = file.patch
      const numberOfCharacters = patch?.length || 0
      const fileSizeLimit = CONTEXT_LENGTH - baseContent.length
      // Send the patch data to ChatGPT for review
      if (numberOfCharacters < fileSizeLimit) {
        try {
          const { data: gptResponse } = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4-1106-preview',
              messages: [
                {
                  role: 'user',
                  content: `${baseContent}${patch}`
                }
              ]
            },
            {
              headers: {
                Authorization: `Bearer ${gptApiKey}`
              }
            }
          )
          const review = gptResponse.choices[0].message.content
          console.log(review)

          if (!review.includes('No comment')) {
            // Comment PR with GPT response
            await octokit.rest.pulls.createReviewComment({
              owner,
              repo,
              pull_number: number,
              body: review,
              path: filePath,
              commit_id: commitId,
              position: COMMENT_POSITION
            })
          }
        } catch (error) {
          return handleError(error, core)
        }
      } else {
        console.log('File is too large.')
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    return handleError(error, core)
  }

  return RETURN_CODES.SUCCESS
}
