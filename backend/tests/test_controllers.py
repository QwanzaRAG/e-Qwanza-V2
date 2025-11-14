import os
import shutil
import tempfile

import pytest

from controllers.BaseController import BaseController
from controllers.ProjectController import ProjectController
from controllers.DataController import DataController


def test_base_controller_random_and_db_path(tmp_path):
    ctrl = BaseController()
    # random string length
    s = ctrl.generate_random_string(16)
    assert isinstance(s, str) and len(s) == 16

    # database path ensures directory exists
    db_dir = ctrl.get_database_path("testdb")
    assert os.path.isdir(db_dir)


def test_project_controller_get_project_path_creates_dir(tmp_path):
    # rediriger le répertoire des fichiers vers un tmp
    proj_ctrl = ProjectController()
    proj_ctrl.files_dir = str(tmp_path)

    p = proj_ctrl.get_project_path("123")
    assert os.path.isdir(p)
    assert p.endswith(os.path.join(str(tmp_path), "123"))


class DummyUpload:
    def __init__(self, content_type: str, size: int, filename: str = "file.txt"):
        self.content_type = content_type
        self.size = size
        self.filename = filename


def test_data_controller_validate_uploaded_file_respects_type_and_size(monkeypatch):
    data_ctrl = DataController()

    # Forcer la configuration autorisée
    monkeypatch.setattr(data_ctrl.app_settings, "FILE_ALLOWED_TYPES", ["text/plain", "application/pdf"])
    monkeypatch.setattr(data_ctrl.app_settings, "FILE_MAX_SIZE", 1)  # 1 MB

    ok, signal = data_ctrl.validate_uploaded_file(DummyUpload("text/plain", size=512_000))
    assert ok is True

    ok, signal = data_ctrl.validate_uploaded_file(DummyUpload("image/png", size=10))
    assert ok is False

    ok, signal = data_ctrl.validate_uploaded_file(DummyUpload("application/pdf", size=2_000_000))
    assert ok is False


def test_data_controller_generate_unique_filepath_handles_duplicates(tmp_path):
    data_ctrl = DataController()
    # Rediriger le dossier des fichiers de projet via ProjectController.files_dir
    proj_ctrl = ProjectController()
    proj_ctrl.files_dir = str(tmp_path)

    # Monkeypatcher l'instance utilisée en interne par DataController
    # en remplaçant la méthode get_project_path pour pointer sur tmp
    def fake_get_project_path(project_id: str):
        p = os.path.join(str(tmp_path), project_id)
        os.makedirs(p, exist_ok=True)
        return p

    from controllers import ProjectController as PCModule
    original_class = PCModule.ProjectController
    try:
        PCModule.ProjectController = lambda: type("PC", (), {"get_project_path": staticmethod(fake_get_project_path)})

        # Premier appel -> nom original
        path1, name1 = data_ctrl.generate_unique_filepath("Report.pdf", project_id="42")
        open(path1, "w").close()
        assert name1 == "Report.pdf"

        # Deuxième appel, même nom -> suffixe _1
        path2, name2 = data_ctrl.generate_unique_filepath("Report.pdf", project_id="42")
        assert path2 != path1
        assert path2.endswith("_1.pdf")
    finally:
        PCModule.ProjectController = original_class






