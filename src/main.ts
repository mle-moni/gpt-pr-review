import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { error } from 'console'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
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

    for (const file of files) {
      const filePath = file.filename
      const patch = file.patch
      const numberOfCharacters = patch?.length || 0

      // Send the patch data to ChatGPT for review
      if (numberOfCharacters < 4096) {
        try {
          const { data: gptResponse } = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'user',
                  content: `Keep in mind that you are here to help a lead developper revieweing a pull request from a developer. You don't have to provide comments if the code is fine. Review the following code and provide brief comments :\n${patch}`
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

          // Comment PR with GPT response
          await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: number,
            body: review,
            path: filePath,
            commit_id: commitId,
            position: 1
          })
        } catch (err) {
          console.log(err)
        }
      } else {
        console.log('File is too large.')
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
