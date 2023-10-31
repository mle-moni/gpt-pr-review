import * as core from '@actions/core'
import * as github from '@actions/github'

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
    const octokit = github.getOctokit(githubToken)

    // Get the context
    const { owner, repo, number } = github.context.issue
    console.log('owner: ' + owner)
    console.log('repo: ' + repo)
    console.log('number: ' + number)

    // Get PR content
    const { data: prData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number
    })
    console.log('prData: ' + prData)

    const prContent = prData.body

    console.log(`PR Content: ${prContent}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
