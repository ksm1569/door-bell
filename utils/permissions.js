// 관리자 권한 확인 함수
function isAdmin(member) {
  return member.permissions.has('Administrator') || member.permissions.has('ManageGuild');
}

module.exports = { isAdmin }; 