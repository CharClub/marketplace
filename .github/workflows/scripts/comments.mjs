export const getComment = async function (context, github) {
  const comments = await github.rest.issues.listComments({
    issue_number: context.issue.number,
    repo: context.repo.repo,
    owner: context.repo.owner,
  });

  return comments.data.find(
    (c) => c.user.login === 'github-actions[bot]' && c.user.type === 'Bot'
  );
};

export const createComment = function (context, github, body) {
  return github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body,
  });
};

export const updateComment = function (context, github, id, body) {
  return github.rest.issues.updateComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: id,
    body,
  });
};

export const deleteComment = function (context, github, id) {
  return github.rest.issues.deleteComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    comment_id: id,
  });
};
